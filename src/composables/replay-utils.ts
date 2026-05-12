import type { ReplayMarkerUpdate } from "@/composables/replay-types";

interface MarkerTrackState {
  position: [number, number];
  rotation: number;
}

const markerTrackStates = new Map<string, MarkerTrackState>();

// 一组“脏数据容错”工具，负责把后端松散结构归一成前端能消费的 marker 数据。
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePayloadJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function resolveAddressId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeRotation(value: number): number {
  const normalized = value % 360;
  return normalized >= 0 ? normalized : normalized + 360;
}

function positionsAreEqual(nextPosition: [number, number], prevPosition: [number, number]): boolean {
  return nextPosition[0] === prevPosition[0] && nextPosition[1] === prevPosition[1];
}

function calculateRotationFromPosition(
  id: string,
  position: [number, number],
): number {
  const prevState = markerTrackStates.get(id);

  if (!prevState) {
    markerTrackStates.set(id, {
      position,
      rotation: 0,
    });
    return 0;
  }

  if (positionsAreEqual(position, prevState.position)) {
    return prevState.rotation;
  }

  const [prevLongitude, prevLatitude] = prevState.position;
  const [longitude, latitude] = position;
  const avgLatitudeRad = ((prevLatitude + latitude) / 2) * (Math.PI / 180);
  const deltaLongitude = (longitude - prevLongitude) * Math.cos(avgLatitudeRad);
  const deltaLatitude = latitude - prevLatitude;
  const rotation = normalizeRotation((Math.atan2(deltaLongitude, deltaLatitude) * 180) / Math.PI);

  markerTrackStates.set(id, {
    position,
    rotation,
  });

  return rotation;
}

function extractReplayPayload(message: unknown): unknown {
  if (!isRecord(message)) {
    return null;
  }

  // 某些场景已经是解析后的 payload，另一些场景还包在 attributes.payloadJson 里。
  if (Array.isArray(message.info)) {
    return message;
  }

  if (!isRecord(message.attributes)) {
    return null;
  }

  return parsePayloadJson(message.attributes.payloadJson);
}

function buildMarkerUpdateFromArmsTarget(item: Record<string, unknown>): ReplayMarkerUpdate | null {
  if (!isRecord(item.armsTargetGRIs)) {
    return null;
  }

  const payload = item.armsTargetGRIs;
  const positionTime = isRecord(payload.positionTime) ? payload.positionTime : null;
  const positionTimes = positionTime && isRecord(positionTime.positionTimes) ? positionTime.positionTimes : null;
  const id = resolveAddressId(item.addressNo) ?? resolveAddressId(item.addressNO);
  const latitude = positionTimes ? toFiniteNumber(positionTimes.latitude) : null;
  const longitude = positionTimes ? toFiniteNumber(positionTimes.longitude) : null;

  if (!id || latitude === null || longitude === null) {
    return null;
  }

  // armsTargetGRIs 通常对应 messageNo=1 的目标位置信息。
  return {
    id,
    position: [longitude, latitude],
    rotation: calculateRotationFromPosition(id, [longitude, latitude]),
    source: "armsTargetGRIs",
  };
}

function buildMarkerUpdateFromPositionDynamics(item: Record<string, unknown>): ReplayMarkerUpdate | null {
  if (!isRecord(item.positionDynamics)) {
    return null;
  }

  const payload = item.positionDynamics;
  const areaAttributeR = isRecord(payload.areaAttributeR) ? payload.areaAttributeR : null;
  const id =
    resolveAddressId(payload.addressNo) ??
    resolveAddressId(payload.addressNO) ??
    resolveAddressId(item.addressNo) ??
    resolveAddressId(item.addressNO);
  const latitude = areaAttributeR ? toFiniteNumber(areaAttributeR.lat) : null;
  const longitude = areaAttributeR ? toFiniteNumber(areaAttributeR.lon) : null;

  if (!id || latitude === null || longitude === null) {
    return null;
  }

  // positionDynamics 走 heading，通常是另一类位置动态消息。
  return {
    id,
    position: [longitude, latitude],
    rotation: calculateRotationFromPosition(id, [longitude, latitude]),
    source: "positionDynamics",
  };
}

export function extractMarkerUpdates(message: unknown): ReplayMarkerUpdate[] {
  const payload = extractReplayPayload(message);
  if (!isRecord(payload) || !Array.isArray(payload.info)) {
    return [];
  }

  const updates: ReplayMarkerUpdate[] = [];

  for (const item of payload.info) {
    if (!isRecord(item)) {
      continue;
    }

    // 同一条 SSE 里可能混有多种结构，按支持的结构逐个尝试提取。
    const update = buildMarkerUpdateFromArmsTarget(item) ?? buildMarkerUpdateFromPositionDynamics(item);
    if (!update) {
      continue;
    }

    // 过滤明显无效的原点坐标，避免地图上出现脏 marker。
    const [longitude, latitude] = update.position;
    if (longitude === 0 && latitude === 0) {
      continue;
    }

    updates.push(update);
  }

  return updates;
}

export function resetMarkerTrackStates(): void {
  markerTrackStates.clear();
}

export function formatMessageForLog(message: unknown): string {
  if (typeof message === "string") {
    return message;
  }

  try {
    return JSON.stringify(message, null, 2);
  } catch {
    return String(message);
  }
}

export function formatSimTime(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// 表单输入来自字符串，统一在这里做边界兜底。
export function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseNonNegativeInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  return search.toString();
}

// 部分接口失败时返回的并不一定是 JSON，这里保持尽量宽松。
export function parseJsonText(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
