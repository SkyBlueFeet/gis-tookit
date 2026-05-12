import type { AjaxResult } from "@/composables/replay-types";
import { buildQueryString, formatMessageForLog, parseJsonText } from "@/composables/replay-utils";

const engineApiBase = "/api/engine";

export interface WebSocketClientStatus {
  enabled: boolean;
  running: boolean;
  uri: string | null;
  activeHandlers: number;
  queuedHandlers: number;
}

export interface EngineControlRuntimeStatus {
  started: boolean;
  paused: boolean;
  stopRequested: boolean;
  speed: number | null;
  stepLength: number | null;
  lastCommand: string | null;
  lastCommandAt: string | null;
}

export interface EngineLogStatus {
  enabled: boolean;
  activeRunId: string | null;
  shardCount: number;
  queuedRecords: number;
  persistedRecords: number;
  droppedRecords: number;
  nextSequence: number;
}

export interface EngineConnectionStatus {
  enabled: boolean;
  consoleConfigured: boolean;
  consoleUrl: string | null;
  websocket: WebSocketClientStatus | null;
  logging: EngineLogStatus | null;
  control: EngineControlRuntimeStatus | null;
}

export interface EngineStartResult {
  consoleCommandSent: boolean;
  attempts: number;
  consoleResponse: string | null;
  status: EngineConnectionStatus | null;
}

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

async function callEngineApi<T>(
  path: string,
  method: "GET" | "POST",
  params: Record<string, string | number | boolean | null | undefined> = {},
): Promise<AjaxResult<T>> {
  const queryString = buildQueryString(params);
  const url = `${engineApiBase}${path}${queryString ? `?${queryString}` : ""}`;

  return requestJson<AjaxResult<T>>(url, { method });
}

export function startEngine(): Promise<AjaxResult<EngineStartResult>> {
  return callEngineApi<EngineStartResult>("/start", "POST");
}

export function getEngineStatus(): Promise<AjaxResult<EngineConnectionStatus>> {
  return callEngineApi<EngineConnectionStatus>("/status", "GET");
}

export function disconnectEngine(): Promise<AjaxResult<EngineConnectionStatus>> {
  return callEngineApi<EngineConnectionStatus>("/disconnect", "POST");
}

export function updateEngineSpeed(speed: number, stepLength: number): Promise<AjaxResult<EngineConnectionStatus>> {
  return callEngineApi<EngineConnectionStatus>("/speed", "POST", { speed, stepLength });
}

export function pauseEngine(): Promise<AjaxResult<EngineConnectionStatus>> {
  return callEngineApi<EngineConnectionStatus>("/pause", "POST");
}

export function resumeEngine(): Promise<AjaxResult<EngineConnectionStatus>> {
  return callEngineApi<EngineConnectionStatus>("/resume", "POST");
}

export function stopEngine(): Promise<AjaxResult<EngineConnectionStatus>> {
  return callEngineApi<EngineConnectionStatus>("/stop", "POST");
}

export function requestEngineStatus(): Promise<AjaxResult<EngineConnectionStatus>> {
  return callEngineApi<EngineConnectionStatus>("/request-status", "POST");
}

export function getCurrentEngineControl(): Promise<AjaxResult<EngineControlRuntimeStatus>> {
  return callEngineApi<EngineControlRuntimeStatus>("/current", "GET");
}

export function quitEngineBattlefield(entityId: string): Promise<AjaxResult<EngineConnectionStatus>> {
  return callEngineApi<EngineConnectionStatus>("/quit-battlefield", "POST", { entityId });
}
