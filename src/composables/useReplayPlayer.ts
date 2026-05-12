import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  ReplayApiCallOptions,
  ReplayMarkerUpdate,
  ReplayRunRecord,
  ReplayStatus,
} from "@/composables/replay-types";
import { parseNonNegativeInt, parsePositiveInt } from "@/composables/replay-utils";
import { useReplaySse } from "@/composables/useReplaySse";
import {
  getReplayStatus,
  listReplayRuns,
  pauseReplayRun,
  resumeReplayRun,
  seekReplayRun,
  startReplayRun,
  stopReplayRun,
  updateReplayRunSpeed,
} from "@/services/replay-service";

interface UseReplayPlayerOptions {
  onReplayMarkers: (updates: ReplayMarkerUpdate[]) => void;
}

export function useReplayPlayer(options: UseReplayPlayerOptions) {
  // 这一组 ref 都是页面级的回放状态，组件只消费，不直接改服务层细节。
  const replayListOpen = ref(false);
  const replayRuns = ref<ReplayRunRecord[]>([]);
  const replayStatusData = ref<ReplayStatus | null>(null);
  const selectedRunId = ref("");
  const runLimit = ref("20");
  const replaySpeed = ref("1");
  const seekTimeMs = ref("0");
  const seekPreviewMs = ref(0);
  const seekDragging = ref(false);
  const replayBusy = ref<string | null>(null);
  let replayStatusPollTimer: number | null = null;

  // 当前选中的回放记录，主要给时间轴边界和默认值使用。
  const selectedRunRecord = computed(() => {
    return replayRuns.value.find((run) => run.runId === selectedRunId.value) ?? null;
  });

  // 时间轴的起止范围优先取记录本身，运行中再用实时状态兜底。
  const replayRangeStartMs = computed(() => {
    return selectedRunRecord.value?.firstSimTimeMs ?? 0;
  });

  const replayRangeEndMs = computed(() => {
    return selectedRunRecord.value?.lastSimTimeMs ?? replayStatusData.value?.currentSimTimeMs ?? 0;
  });

  const replayCurrentSimTimeMs = computed(() => {
    return replayStatusData.value?.currentSimTimeMs ?? replayRangeStartMs.value;
  });

  const replayDurationMs = computed(() => {
    return Math.max(replayRangeEndMs.value - replayRangeStartMs.value, 0);
  });

  const replayProgressPercent = computed(() => {
    if (replayDurationMs.value <= 0) {
      return 0;
    }

    return ((replayCurrentSimTimeMs.value - replayRangeStartMs.value) / replayDurationMs.value) * 100;
  });

  function logInfo(message: string, payload?: unknown): void {
    if (payload === undefined) {
      console.log(`[LeafletDemoPage] ${message}`);
      return;
    }

    console.log(`[LeafletDemoPage] ${message}`, payload);
  }

  function logError(message: string, payload?: unknown): void {
    if (payload === undefined) {
      console.error(`[LeafletDemoPage] ${message}`);
      return;
    }

    console.error(`[LeafletDemoPage] ${message}`, payload);
  }

  const { sseStatus, ensureConnectedForRun, dispose: disposeSse } = useReplaySse({
    selectedRunId,
    onReplayMarkers: options.onReplayMarkers,
    logInfo,
    logError,
    baseUrl: "/api/engine/messages/stream/replay",
  });

  // 所有回放接口都统一经过这里，集中处理 busy 状态和日志输出。
  async function runReplayAction<T>(
    action: string,
    request: () => Promise<T>,
    options: ReplayApiCallOptions = {},
  ): Promise<T | null> {
    if (!options.silent) {
      replayBusy.value = action;
      logInfo(`[replay:${action}:request]`);
    }

    try {
      const result = await request();
      if (!options.silent) {
        logInfo(`[replay:${action}:response]`, result);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!options.silent) {
        logError(`[replay:${action}:error] ${message}`);
      }
      return null;
    } finally {
      if (!options.silent) {
        replayBusy.value = null;
      }
    }
  }

  function selectReplayRun(runId: string): void {
    selectedRunId.value = runId;
    logInfo(`[replay] 已选择 runId: ${runId}`);
  }

  function openReplayList(): void {
    replayListOpen.value = true;
    // 首次打开时自动拉一次，避免弹窗先出现空白。
    if (replayRuns.value.length === 0) {
      void fetchReplayRuns();
    }
  }

  function closeReplayList(): void {
    replayListOpen.value = false;
  }

  async function fetchReplayRuns(): Promise<void> {
    const result = await runReplayAction("runs", () => listReplayRuns(parsePositiveInt(runLimit.value, 20)));

    if (!result || !Array.isArray(result.data)) {
      return;
    }

    replayRuns.value = result.data as ReplayRunRecord[];

    // 列表第一次加载成功时，默认选中第一条，减少一次手动选择。
    if (!selectedRunId.value && replayRuns.value[0]?.runId) {
      selectReplayRun(replayRuns.value[0].runId);
    }
  }

  async function fetchReplayStatus(options: ReplayApiCallOptions = {}): Promise<void> {
    const result = await runReplayAction("status", () => getReplayStatus(), options);

    if (!result || !result.data || typeof result.data !== "object") {
      return;
    }

    replayStatusData.value = result.data as ReplayStatus;

    // 页面上的速度选择框会同步服务端状态，避免显示旧值。
    replaySpeed.value = String(replayStatusData.value.speed ?? 1);

    // 如果服务端已经在跑某个 run，则以前端状态为准重新对齐当前选中项。
    if (
      replayStatusData.value.runId &&
      (!selectedRunId.value || replayStatusData.value.state === "RUNNING" || replayStatusData.value.state === "PAUSED")
    ) {
      selectReplayRun(replayStatusData.value.runId);
    }

    // 只有运行中或暂停中才需要接入 SSE 推送；停止和完成只保留轮询结果。
    if (
      replayStatusData.value.runId &&
      (replayStatusData.value.state === "RUNNING" || replayStatusData.value.state === "PAUSED")
    ) {
      await ensureConnectedForRun();
    }
  }

  function startReplayStatusPolling(): void {
    // 轮询负责兜底状态一致性，SSE 只负责推送位置信息。
    if (replayStatusPollTimer !== null) {
      window.clearInterval(replayStatusPollTimer);
    }

    replayStatusPollTimer = window.setInterval(() => {
      void fetchReplayStatus({ silent: true });
    }, 1000);
  }

  function stopReplayStatusPolling(): void {
    if (replayStatusPollTimer === null) {
      return;
    }

    window.clearInterval(replayStatusPollTimer);
    replayStatusPollTimer = null;
  }

  async function startReplay(): Promise<void> {
    if (!selectedRunId.value.trim()) {
      logError("[replay:start:error] 请先选择一个 runId");
      return;
    }

    const result = await runReplayAction("start", () =>
      startReplayRun(selectedRunId.value.trim(), parsePositiveInt(replaySpeed.value, 1)),
    );

    if (!result) {
      return;
    }

    closeReplayList();
    // 启动后优先连上 SSE，这样时间轴和 marker 不会晚一拍。
    await ensureConnectedForRun();
    await fetchReplayStatus();
  }

  async function pauseReplay(): Promise<void> {
    const result = await runReplayAction("pause", () => pauseReplayRun());
    if (result) {
      await fetchReplayStatus();
    }
  }

  async function resumeReplay(): Promise<void> {
    const result = await runReplayAction("resume", () => resumeReplayRun());
    if (result) {
      await fetchReplayStatus();
    }
  }

  async function stopReplay(): Promise<void> {
    const result = await runReplayAction("stop", () => stopReplayRun());
    if (result) {
      await fetchReplayStatus();
    }
  }

  async function updateReplaySpeed(): Promise<void> {
    const result = await runReplayAction("speed", () => updateReplayRunSpeed(parsePositiveInt(replaySpeed.value, 1)));

    if (result) {
      await fetchReplayStatus();
    }
  }

  async function seekReplay(): Promise<void> {
    const result = await runReplayAction("seek", () => seekReplayRun(parseNonNegativeInt(seekTimeMs.value, 0)));

    if (result) {
      await fetchReplayStatus();
    }
  }

  function beginSeekDrag(): void {
    seekDragging.value = true;
  }

  async function applySeekPreview(): Promise<void> {
    // 拖拽结束后才真正发 seek 请求，避免每一帧都打后端。
    seekDragging.value = false;
    seekTimeMs.value = String(seekPreviewMs.value);
    await seekReplay();
  }

  // 当用户切换回放记录时，把时间轴预览点复位到该记录起始时间。
  watch(selectedRunRecord, (run) => {
    if (!run || seekDragging.value) {
      return;
    }

    seekPreviewMs.value = run.firstSimTimeMs ?? 0;
  });

  // 非拖拽状态下，时间轴滑块跟随服务端当前播放时间走。
  watch(replayStatusData, (status) => {
    if (!status || seekDragging.value) {
      return;
    }

    seekPreviewMs.value = status.currentSimTimeMs ?? replayRangeStartMs.value;
  });

  onMounted(() => {
    // 页面打开后立即具备“看列表 + 看状态”的基础能力。
    logInfo("页面已就绪，可查询回放列表并开始回放调试");
    void fetchReplayRuns();
    void fetchReplayStatus();
    startReplayStatusPolling();
  });

  onBeforeUnmount(() => {
    // 页面离开时停止轮询并断开 SSE，避免后台继续占资源。
    stopReplayStatusPolling();
    disposeSse();
  });

  return {
    replayListOpen,
    replayRuns,
    replayStatusData,
    selectedRunId,
    runLimit,
    replaySpeed,
    seekPreviewMs,
    replayBusy,
    sseStatus,
    replayRangeStartMs,
    replayRangeEndMs,
    replayCurrentSimTimeMs,
    replayProgressPercent,
    openReplayList,
    closeReplayList,
    selectReplayRun,
    fetchReplayRuns,
    fetchReplayStatus,
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,
    updateReplaySpeed,
    beginSeekDrag,
    applySeekPreview,
  };
}
