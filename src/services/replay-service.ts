import type { AjaxResult, ReplayStatus, ReplayRunRecord } from "@/composables/replay-types";
import { buildQueryString, formatMessageForLog, parseJsonText } from "@/composables/replay-utils";

const replayApiBase = "/api/engine/replay";

// 统一的 JSON 请求器：负责 Accept 头、错误体解析和错误信息拼接。
async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = parseJsonText(text);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${formatMessageForLog(payload)}`);
  }

  return payload as T;
}

// 回放页所有接口都走这一层，便于后续替换 base url 或加鉴权。
async function callReplayApi<T>(
  path: string,
  method: "GET" | "POST",
  params: Record<string, string | number | boolean | null | undefined> = {},
): Promise<AjaxResult<T>> {
  const queryString = buildQueryString(params);
  const url = `${replayApiBase}${path}${queryString ? `?${queryString}` : ""}`;

  return requestJson<AjaxResult<T>>(url, { method });
}

// 下面导出的函数只描述“业务动作”，不把 URL 拼接细节暴露给页面层。
export function listReplayRuns(limit: number): Promise<AjaxResult<ReplayRunRecord[]>> {
  return callReplayApi<ReplayRunRecord[]>("/runs", "GET", { limit });
}

export function getReplayStatus(): Promise<AjaxResult<ReplayStatus>> {
  return callReplayApi<ReplayStatus>("/status", "GET");
}

export function startReplayRun(runId: string, speed: number): Promise<AjaxResult> {
  return callReplayApi("/start", "POST", { runId, speed });
}

export function pauseReplayRun(): Promise<AjaxResult> {
  return callReplayApi("/pause", "POST");
}

export function resumeReplayRun(): Promise<AjaxResult> {
  return callReplayApi("/resume", "POST");
}

export function stopReplayRun(): Promise<AjaxResult> {
  return callReplayApi("/stop", "POST");
}

export function updateReplayRunSpeed(speed: number): Promise<AjaxResult> {
  return callReplayApi("/speed", "POST", { speed });
}

export function seekReplayRun(simTimeMs: number): Promise<AjaxResult> {
  return callReplayApi("/seek", "POST", { simTimeMs });
}
