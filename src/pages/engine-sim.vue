<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useLeafletReplayMap } from "@/composables/useLeafletReplayMap";
import { useReplaySse } from "@/composables/useReplaySse";
import {
  disconnectEngine,
  getCurrentEngineControl,
  getEngineStatus,
  pauseEngine,
  quitEngineBattlefield,
  requestEngineStatus,
  resumeEngine,
  startEngine,
  stopEngine,
  updateEngineSpeed,
  type EngineConnectionStatus,
  type EngineControlRuntimeStatus,
  type EngineStartResult,
} from "@/services/engine-service";
import type { AjaxResult } from "@/composables/replay-types";

type Tone = "neutral" | "success" | "error";

// 直接复用 leaflet-demo 的地图渲染内容，保持同一套底图、初始视角和 marker 渲染能力。
const { mapContainer, upsertReplayMarkers } = useLeafletReplayMap();
const autoRefresh = ref(true);
const advancedOpen = ref(false);
const busyAction = ref<string | null>(null);
const statusLoading = ref(false);
const currentLoading = ref(false);
const speedInput = ref("1");
const stepLengthInput = ref("1");
const entityIdInput = ref("");
const latestStatus = ref<EngineConnectionStatus | null>(null);
const latestCurrent = ref<EngineControlRuntimeStatus | null>(null);
const latestStartResult = ref<EngineStartResult | null>(null);
const bannerMessage = ref("正在等待引擎状态");
const bannerTone = ref<Tone>("neutral");
const streamRunId = ref("");

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function logInfo(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.log(`[EngineSimPage] ${message}`);
    return;
  }

  console.log(`[EngineSimPage] ${message}`, payload);
}

function logError(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.error(`[EngineSimPage] ${message}`);
    return;
  }

  console.error(`[EngineSimPage] ${message}`, payload);
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  return String(value);
}

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "--";
  }

  return value.replace("T", " ");
}

function coercePositiveNumber(raw: string, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const effectiveStatus = computed(() => latestStatus.value ?? latestStartResult.value?.status ?? null);
const effectiveControl = computed(() => latestCurrent.value ?? effectiveStatus.value?.control ?? null);

const enginePhaseLabel = computed(() => {
  const control = effectiveControl.value;

  if (!control) {
    return "未知";
  }

  if (control.stopRequested) {
    return control.started ? "停止中" : "已结束";
  }

  if (control.paused) {
    return "已暂停";
  }

  if (control.started) {
    return "运行中";
  }

  return "未启动";
});

const mainStatus = computed(() => [
  { label: "状态", value: enginePhaseLabel.value },
  { label: "倍速", value: formatDisplayValue(effectiveControl.value?.speed) },
  { label: "步长", value: formatDisplayValue(effectiveControl.value?.stepLength) },
]);

const secondaryStatus = computed(() => [
  { label: "已启动", value: formatDisplayValue(effectiveControl.value?.started) },
  { label: "已暂停", value: formatDisplayValue(effectiveControl.value?.paused) },
  { label: "停止请求", value: formatDisplayValue(effectiveControl.value?.stopRequested) },
  { label: "最近命令", value: formatDisplayValue(effectiveControl.value?.lastCommand) },
  { label: "命令时间", value: formatTime(effectiveControl.value?.lastCommandAt) },
  { label: "状态拉取", value: statusLoading.value ? "加载中" : "就绪" },
  { label: "控制拉取", value: currentLoading.value ? "加载中" : "就绪" },
]);

const { ensureConnectedForRun, dispose: disposeSse } = useReplaySse({
  selectedRunId: streamRunId,
  onReplayMarkers: upsertReplayMarkers,
  logInfo,
  logError,
  allowEmptyRunId: true,
  baseUrl: "/api/engine/messages/stream/live",
});

async function refreshStatus(silent = false): Promise<void> {
  statusLoading.value = true;

  try {
    const result = await getEngineStatus();
    latestStatus.value = result.data ?? null;
    if (!silent) {
      bannerTone.value = "success";
      bannerMessage.value = result.msg || "已刷新引擎状态";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!silent) {
      bannerTone.value = "error";
      bannerMessage.value = message;
    }
  } finally {
    statusLoading.value = false;
  }
}

async function refreshCurrent(silent = false): Promise<void> {
  currentLoading.value = true;

  try {
    const result = await getCurrentEngineControl();
    latestCurrent.value = result.data ?? null;
    if (!silent) {
      bannerTone.value = "success";
      bannerMessage.value = result.msg || "已刷新控制状态";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!silent) {
      bannerTone.value = "error";
      bannerMessage.value = message;
    }
  } finally {
    currentLoading.value = false;
  }
}

async function refreshAll(silent = false): Promise<void> {
  await Promise.all([refreshStatus(silent), refreshCurrent(silent)]);
}

function applyConnectionStatus(result: AjaxResult<EngineConnectionStatus>): void {
  if (result.data) {
    latestStatus.value = result.data;
  }

  if (result.data?.control) {
    latestCurrent.value = result.data.control;
  }
}

async function runAction<T>(
  actionName: string,
  request: () => Promise<AjaxResult<T>>,
  afterSuccess?: (result: AjaxResult<T>) => void,
): Promise<void> {
  busyAction.value = actionName;

  try {
    const result = await request();
    afterSuccess?.(result);
    bannerTone.value = "success";
    bannerMessage.value = result.msg || `${actionName}已完成`;
    await refreshAll(true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    bannerTone.value = "error";
    bannerMessage.value = message;
  } finally {
    busyAction.value = null;
  }
}

function handleStart(): Promise<void> {
  return runAction("启动引擎", startEngine, (result) => {
    latestStartResult.value = (result.data as EngineStartResult | undefined) ?? null;
    if (latestStartResult.value?.status) {
      latestStatus.value = latestStartResult.value.status;
      latestCurrent.value = latestStartResult.value.status.control;
    }
  });
}

function handlePause(): Promise<void> {
  return runAction("暂停引擎", pauseEngine, applyConnectionStatus);
}

function handleResume(): Promise<void> {
  return runAction("继续引擎", resumeEngine, applyConnectionStatus);
}

function handleStop(): Promise<void> {
  return runAction("结束引擎", stopEngine, applyConnectionStatus);
}

function handleRequestStatus(): Promise<void> {
  return runAction("请求引擎状态", requestEngineStatus, applyConnectionStatus);
}

function handleDisconnect(): Promise<void> {
  return runAction("断开引擎连接", disconnectEngine, applyConnectionStatus);
}

function handleSpeedUpdate(): Promise<void> {
  const speed = coercePositiveNumber(speedInput.value, 1);
  const stepLength = coercePositiveNumber(stepLengthInput.value, 1);
  speedInput.value = String(speed);
  stepLengthInput.value = String(stepLength);

  return runAction("更新引擎倍速", () => updateEngineSpeed(speed, stepLength), applyConnectionStatus);
}

function handleQuitBattlefield(): Promise<void> {
  const entityId = entityIdInput.value.trim();
  if (!entityId) {
    bannerTone.value = "error";
    bannerMessage.value = "实体 ID 不能为空";
    return Promise.resolve();
  }

  return runAction("退出战场", () => quitEngineBattlefield(entityId), applyConnectionStatus);
}

function startAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(() => {
    if (!autoRefresh.value || busyAction.value) {
      return;
    }

    void refreshAll(true);
  }, 5000);
}

onMounted(() => {
  void refreshAll(true).then(() => {
    bannerTone.value = "success";
    bannerMessage.value = "已加载引擎状态";
  });

  // 实时引擎页直接订阅当前消息流，不附加 runId 过滤，复用 leaflet-demo 的同一套 marker 渲染。
  void ensureConnectedForRun();
  startAutoRefresh();
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  disposeSse();
});
</script>

<template>
  <div class="engine-sim-page">
    <section class="engine-sim-map-shell">
      <div ref="mapContainer" class="engine-sim-map"></div>

      <header class="sim-header">
        <div class="sim-title">
          <p class="sim-kicker">ENGINE PLAYER</p>
          <h1>engine-sim</h1>
        </div>
        <button class="header-btn" type="button" @click="advancedOpen = !advancedOpen">
          {{ advancedOpen ? "收起详情" : "更多状态" }}
        </button>
      </header>

      <aside v-if="advancedOpen" class="advanced-panel">
        <div class="advanced-head">
          <div>
            <p class="sim-kicker">SECOND LAYER</p>
            <h2>状态与补充控制</h2>
          </div>
          <button class="header-btn" type="button" @click="advancedOpen = false">关闭</button>
        </div>

        <div :class="['result-banner', `tone-${bannerTone}`]">
          {{ bannerMessage }}
        </div>

        <div class="advanced-grid">
          <div v-for="row in secondaryStatus" :key="row.label" class="advanced-item">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
          </div>
        </div>

        <div class="advanced-section">
          <div class="section-head">
            <h3>倍速设置</h3>
            <button class="secondary-btn" type="button" :disabled="!!busyAction" @click="handleSpeedUpdate()">
              {{ busyAction === "更新引擎倍速" ? "提交中..." : "发送" }}
            </button>
          </div>
          <div class="form-grid two-cols">
            <label class="field">
              <span>speed</span>
              <input v-model="speedInput" inputmode="decimal" type="text" placeholder="1.0" />
            </label>
            <label class="field">
              <span>stepLength</span>
              <input v-model="stepLengthInput" inputmode="decimal" type="text" placeholder="1.0" />
            </label>
          </div>
        </div>

        <div class="advanced-section">
          <div class="section-head">
            <h3>实体退场</h3>
            <button class="secondary-btn danger-outline" type="button" :disabled="!!busyAction" @click="handleQuitBattlefield()">
              {{ busyAction === "退出战场" ? "发送中..." : "退出战场" }}
            </button>
          </div>
          <div class="form-grid">
            <label class="field">
              <span>entityId</span>
              <input v-model="entityIdInput" type="text" placeholder="例如: UNIT-0001" />
            </label>
          </div>
        </div>

        <div class="advanced-section advanced-actions">
          <button class="secondary-btn" type="button" :disabled="!!busyAction" @click="refreshAll()">
            刷新状态
          </button>
          <button class="secondary-btn" type="button" :disabled="!!busyAction" @click="handleRequestStatus()">
            请求状态
          </button>
          <button class="secondary-btn" type="button" :disabled="!!busyAction" @click="handleDisconnect()">
            断开连接
          </button>
          <label class="switch">
            <input v-model="autoRefresh" type="checkbox" />
            <span>自动刷新</span>
          </label>
        </div>
      </aside>

      <footer class="player-dock">
        <div class="dock-message" :class="`tone-${bannerTone}`">
          {{ bannerMessage }}
        </div>

        <div class="dock-status">
          <div
            v-for="item in mainStatus"
            :key="item.label"
            class="dock-status-item"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <div class="transport-controls">
          <button class="transport-btn start" type="button" :disabled="!!busyAction" @click="handleStart()">
            {{ busyAction === "启动引擎" ? "启动中..." : "启动" }}
          </button>
          <button class="transport-btn" type="button" :disabled="!!busyAction" @click="handlePause()">
            {{ busyAction === "暂停引擎" ? "处理中..." : "暂停" }}
          </button>
          <button class="transport-btn" type="button" :disabled="!!busyAction" @click="handleResume()">
            {{ busyAction === "继续引擎" ? "处理中..." : "继续" }}
          </button>
          <button class="transport-btn stop" type="button" :disabled="!!busyAction" @click="handleStop()">
            {{ busyAction === "结束引擎" ? "处理中..." : "结束" }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<route lang="yaml">
name: engine-sim
path: /engine-sim
meta:
  layout: blank
</route>

<style scoped>
.engine-sim-page {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(219, 242, 255, 0.85), transparent 28%),
    linear-gradient(135deg, #081120 0%, #11243f 45%, #183357 100%);
}

.engine-sim-map-shell {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 20px;
  isolation: isolate;
}

.engine-sim-map {
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  border-radius: 28px;
  box-shadow: 0 24px 80px rgba(2, 8, 18, 0.38);
}

.sim-header,
.advanced-panel,
.player-dock {
  position: absolute;
  z-index: 1600;
}

.sim-header {
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  pointer-events: none;
}

.sim-title,
.header-btn,
.advanced-panel,
.player-dock,
.result-banner,
.dock-status-item {
  border: 1px solid rgba(171, 194, 230, 0.18);
  background: rgba(7, 15, 26, 0.8);
  box-shadow: 0 20px 52px rgba(2, 8, 18, 0.3);
  backdrop-filter: blur(18px);
}

.sim-title {
  padding: 16px 18px;
  border-radius: 22px;
  pointer-events: auto;
}

.sim-kicker,
.dock-status-item span,
.advanced-item span,
.field span,
.switch span {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(218, 229, 245, 0.7);
}

.sim-title h1,
.advanced-head h2,
.section-head h3 {
  margin: 0;
  color: #f5f8ff;
}

.sim-title h1 {
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1;
}

.header-btn,
.secondary-btn,
.transport-btn {
  color: #f5f8ff;
  cursor: pointer;
}

.header-btn {
  pointer-events: auto;
  padding: 12px 16px;
  border-radius: 16px;
}

.advanced-panel {
  top: 20px;
  right: 20px;
  bottom: 120px;
  width: 380px;
  padding: 18px;
  border-radius: 24px;
  overflow: auto;
  color: #f5f8ff;
}

.advanced-head,
.section-head,
.advanced-actions,
.switch,
.transport-controls {
  display: flex;
}

.advanced-head,
.section-head {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.result-banner {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
}

.advanced-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.advanced-item {
  padding: 12px;
  border-radius: 14px;
  background: rgba(13, 22, 35, 0.7);
}

.advanced-item strong {
  display: block;
  margin-top: 6px;
  line-height: 1.35;
}

.advanced-section {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(171, 194, 230, 0.12);
}

.form-grid {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.form-grid.two-cols {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field input {
  border: 1px solid rgba(171, 194, 230, 0.16);
  border-radius: 12px;
  padding: 12px 13px;
  color: #f5f8ff;
  background: rgba(4, 10, 19, 0.72);
  outline: none;
}

.field input:focus {
  border-color: rgba(85, 182, 255, 0.56);
  box-shadow: 0 0 0 4px rgba(48, 137, 255, 0.12);
}

.secondary-btn,
.transport-btn {
  border: 1px solid rgba(171, 194, 230, 0.16);
  background: linear-gradient(180deg, rgba(31, 48, 74, 0.98), rgba(18, 28, 44, 0.98));
}

.secondary-btn {
  padding: 10px 14px;
  border-radius: 12px;
}

.danger-outline {
  border-color: rgba(255, 128, 128, 0.34);
}

.advanced-actions {
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.switch {
  align-items: center;
  gap: 8px;
}

.player-dock {
  left: 50%;
  right: auto;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  align-items: stretch;
  gap: 18px;
  width: min(920px, calc(100% - 40px));
  padding: 14px 18px;
  border-radius: 22px;
}

.dock-message {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 14px;
  color: #e7efff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dock-status {
  display: flex;
  gap: 10px;
}

.dock-status-item {
  min-width: 92px;
  padding: 10px 12px;
  border-radius: 14px;
}

.dock-status-item strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  color: #f5f8ff;
}

.transport-controls {
  align-items: center;
  gap: 10px;
}

.transport-btn {
  min-width: 88px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 14px;
}

.transport-btn.start {
  background: linear-gradient(135deg, #1992ff 0%, #0a6ad6 100%);
}

.transport-btn.stop {
  background: linear-gradient(135deg, #e86060 0%, #b73d3d 100%);
}

.transport-btn:disabled,
.secondary-btn:disabled,
.header-btn:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.tone-success {
  border-color: rgba(89, 224, 173, 0.32);
}

.tone-error {
  border-color: rgba(255, 116, 116, 0.36);
}

@media (max-width: 1100px) {
  .advanced-panel {
    width: 340px;
  }

  .player-dock {
    flex-direction: column;
    align-items: stretch;
  }

  .dock-status {
    flex-wrap: wrap;
  }

  .transport-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
}

@media (max-width: 900px) {
  .engine-sim-map-shell {
    padding: 12px;
  }

  .sim-header {
    top: 12px;
    left: 12px;
    right: 12px;
  }

  .advanced-panel {
    top: 92px;
    right: 12px;
    left: 12px;
    bottom: 116px;
    width: auto;
  }

  .advanced-grid,
  .form-grid.two-cols {
    grid-template-columns: minmax(0, 1fr);
  }

  .player-dock {
    bottom: 12px;
    width: calc(100% - 24px);
  }

  .dock-status {
    flex-direction: column;
  }
}
</style>
