import { ref, type Ref } from "vue";
import {
  createEngineMessageSseClient,
  type EngineMessageKind,
  type EngineMessageSseClient,
} from "@/lib/sse";
import { extractMarkerUpdates, resetMarkerTrackStates } from "@/composables/replay-utils";

const defaultSseBaseUrl = "/api/engine/messages/stream";
const sseIncludeLifecycle = true;

interface UseReplaySseOptions {
  selectedRunId: Ref<string>;
  onReplayMarkers: ReturnType<typeof extractMarkerUpdates> extends infer T ? (updates: T) => void : never;
  logInfo: (message: string, payload?: unknown) => void;
  logError: (message: string, payload?: unknown) => void;
  allowEmptyRunId?: boolean;
  baseUrl?: string;
}

export function useReplaySse(options: UseReplaySseOptions) {
  // 这里只维护 SSE 自己的连接状态，不掺杂播放器业务状态。
  const sseStatus = ref("idle");
  const connectedSseRunId = ref("");

  let sseClient: EngineMessageSseClient | null = null;

  function buildSseUrl(): string {
    // runId 作为查询参数传给后端，保证切换回放时拿到对应流。
    const sseBaseUrl = options.baseUrl ?? defaultSseBaseUrl;
    const isAbsoluteUrl = /^https?:\/\//.test(sseBaseUrl);
    const url = isAbsoluteUrl ? new URL(sseBaseUrl) : new URL(sseBaseUrl, window.location.origin);

    if (options.selectedRunId.value.trim()) {
      url.searchParams.set("runId", options.selectedRunId.value.trim());
    } else {
      url.searchParams.delete("runId");
    }

    url.searchParams.set("includeLifecycle", String(sseIncludeLifecycle));

    return isAbsoluteUrl ? url.toString() : `${url.pathname}${url.search}`;
  }

  function handleParsedMessage(message: unknown, kind: EngineMessageKind): void {
    // SSE 原始消息结构比较松散，这里统一提炼成 marker 更新列表。
    const updates = extractMarkerUpdates(message);
    console.log(
      `[LeafletDemoPage] [${kind}]`,
      (message as { attributes?: { payloadJson?: unknown } })?.attributes?.payloadJson ?? message,
    );

    if (updates.length === 0) {
      return;
    }

    options.onReplayMarkers(updates);
    console.log("[LeafletDemoPage] marker upserts:", updates);
  }

  function connect(): void {
    // 每次连接前先断开旧连接，避免 runId 切换后同时保留多条流。
    const effectiveUrl = buildSseUrl();
    const nextRunId = options.selectedRunId.value.trim();
    const shouldResetMarkerTracks = connectedSseRunId.value !== nextRunId;
    sseClient?.disconnect();
    if (shouldResetMarkerTracks) {
      resetMarkerTrackStates();
    }

    sseClient = createEngineMessageSseClient({
      url: effectiveUrl,
      onOpen: () => {
        sseStatus.value = "connected";
        options.logInfo(`SSE 已连接: ${effectiveUrl}`);
      },
      onError: (event) => {
        sseStatus.value = "error";
        options.logError("SSE 连接异常", event);
      },
      onParsedMessage: (message, kind) => {
        handleParsedMessage(message, kind);
      },
    });

    connectedSseRunId.value = nextRunId;
    sseClient.connect();
  }

  function disconnect(): void {
    sseClient?.disconnect();
    resetMarkerTrackStates();
    sseStatus.value = "disconnected";
    connectedSseRunId.value = "";
    options.logInfo("SSE 已断开");
  }

  async function ensureConnectedForRun(): Promise<void> {
    const targetRunId = options.selectedRunId.value.trim();
    if (!targetRunId && !options.allowEmptyRunId) {
      return;
    }

    // 已经连着同一个 runId 时不重复重连，避免无意义抖动。
    if (sseClient?.isConnected() && connectedSseRunId.value === targetRunId) {
      return;
    }

    connect();
  }

  function dispose(): void {
    // 给外层生命周期调用，确保 client 引用也一起释放。
    disconnect();
    sseClient = null;
  }

  return {
    sseStatus,
    ensureConnectedForRun,
    disconnect,
    dispose,
  };
}
