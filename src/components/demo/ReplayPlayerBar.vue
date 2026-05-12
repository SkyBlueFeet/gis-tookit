<script setup lang="ts">
import { computed } from "vue";
import { formatSimTime } from "@/composables/replay-utils";

interface Props {
  selectedRunId: string;
  replayState?: string | null;
  sseStatus: string;
  replayBusy: string | null;
  replayedCount?: number | null;
  statusSpeed?: number | string | null;
  replayCurrentSimTimeMs: number;
  replayRangeStartMs: number;
  replayRangeEndMs: number;
  replayProgressPercent: number;
}

const props = defineProps<Props>();

const replaySpeed = defineModel<string>("replaySpeed", {
  required: true,
});

// 时间轴滑块直接双向绑定预览值，真正提交 seek 在 change 时机触发。
const seekPreviewMs = defineModel<number>("seekPreviewMs", {
  required: true,
});

const emit = defineEmits<{
  openReplayList: [];
  startReplay: [];
  pauseReplay: [];
  resumeReplay: [];
  stopReplay: [];
  refreshStatus: [];
  updateReplaySpeed: [];
  beginSeekDrag: [];
  applySeekPreview: [];
}>();

const replayStateClass = computed(() => {
  return (props.replayState ?? "idle").toLowerCase();
});

// 这些派生状态用于把 UI 按钮和服务端状态直接对齐。
const isRunning = computed(() => {
  return replayStateClass.value === "running";
});

const isPaused = computed(() => {
  return replayStateClass.value === "paused";
});

const toggleActionLabel = computed(() => {
  if (isRunning.value) {
    return "暂停";
  }

  if (isPaused.value) {
    return "继续";
  }

  return "暂停 / 继续";
});

const sliderMax = computed(() => {
  return Math.max(props.replayRangeEndMs, props.replayRangeStartMs + 1);
});

// 开始前、停止后、完成后都不允许拖进度条，避免出现“能拖但请求无效”。
const canSeek = computed(() => {
  return !!props.selectedRunId && !props.replayBusy && ["running", "paused"].includes(replayStateClass.value);
});

function handleBeginSeekDrag(): void {
  if (!canSeek.value) {
    return;
  }

  emit("beginSeekDrag");
}

function handleApplySeekPreview(): void {
  if (!canSeek.value) {
    return;
  }

  // 这里不在 input 事件实时发送请求，避免拖动时产生大量 seek 调用。
  emit("applySeekPreview");
}
</script>

<template>
  <div class="player-bar">
    <div class="player-bar__top">
      <div class="player-title">
        <span class="player-title__eyebrow">Replay Player</span>
        <strong>{{ selectedRunId || "未选择回放" }}</strong>
      </div>
      <div class="player-status-group">
        <span class="status-pill" :class="`status-pill--${replayStateClass}`">
          {{ replayState ?? "IDLE" }}
        </span>
        <span class="status-pill status-pill--ghost">SSE {{ sseStatus }}</span>
        <button class="player-action player-action--ghost" :disabled="!!replayBusy" @click="$emit('openReplayList')">
          选择回放
        </button>
      </div>
    </div>

    <div class="player-progress">
      <span class="player-time">{{ formatSimTime(replayCurrentSimTimeMs) }}</span>
      <input
        v-model.number="seekPreviewMs"
        class="player-slider"
        type="range"
        :min="replayRangeStartMs"
        :max="sliderMax"
        :disabled="!canSeek"
        @mousedown="handleBeginSeekDrag"
        @touchstart.passive="handleBeginSeekDrag"
        @change="handleApplySeekPreview"
      />
      <span class="player-time">{{ formatSimTime(replayRangeEndMs) }}</span>
    </div>

    <div class="player-controls player-controls--full">
      <div class="player-controls__left">
        <div class="player-meta">
          <span>进度 {{ replayProgressPercent.toFixed(1) }}%</span>
          <span>推送 {{ replayedCount ?? 0 }} 条</span>
          <span>当前倍速 {{ statusSpeed ?? replaySpeed }}x</span>
        </div>
      </div>
      <div class="player-controls__right">
        <!-- 调速仍然保留独立控件，因为它和播放/暂停不是同一类动作 -->
        <div class="player-speed">
          <span>调速</span>
          <select v-model="replaySpeed" class="player-select" :disabled="!!replayBusy" @change="$emit('updateReplaySpeed')">
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
            <option value="8">8x</option>
          </select>
        </div>
        <button class="player-action player-action--primary" :disabled="!!replayBusy || !selectedRunId" @click="$emit('startReplay')">
          播放
        </button>
        <button
          class="player-action"
          :class="{ 'player-action--active': isRunning || isPaused }"
          :disabled="!!replayBusy || (!isRunning && !isPaused)"
          @click="isRunning ? $emit('pauseReplay') : $emit('resumeReplay')"
        >
          <!-- 只保留一个按钮，避免暂停和继续同时出现造成语义重复 -->
          {{ toggleActionLabel }}
        </button>
        <button class="player-action" :disabled="!!replayBusy" @click="$emit('stopReplay')">停止</button>
        <button class="player-action player-action--ghost" :disabled="!!replayBusy" @click="$emit('refreshStatus')">
          刷新
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-bar {
  position: relative;
  z-index: 2001;
  display: grid;
  gap: 14px;
  padding: 18px 20px;
  color: #eff6ff;
  background: linear-gradient(180deg, rgba(7, 16, 29, 0.96), rgba(9, 19, 34, 0.92));
  border: 1px solid rgba(143, 207, 255, 0.2);
  border-radius: 22px;
  box-shadow: 0 26px 60px rgba(1, 7, 16, 0.42);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}

.player-bar__top,
.player-controls,
.player-progress,
.player-status-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-bar__top {
  justify-content: space-between;
  gap: 16px;
}

.player-title {
  display: grid;
  gap: 4px;
}

.player-title strong {
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
  word-break: break-all;
}

.player-title__eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #79c7ff;
}

.player-status-group {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(143, 207, 255, 0.18);
  border-radius: 999px;
  color: #dff4ff;
  background: rgba(255, 255, 255, 0.08);
}

.status-pill--running {
  background: rgba(29, 185, 84, 0.18);
  border-color: rgba(29, 185, 84, 0.36);
}

.status-pill--paused {
  background: rgba(255, 179, 0, 0.18);
  border-color: rgba(255, 179, 0, 0.36);
}

.status-pill--stopped,
.status-pill--completed,
.status-pill--idle {
  background: rgba(255, 255, 255, 0.08);
}

.status-pill--ghost {
  color: rgba(239, 246, 255, 0.82);
}

.player-progress {
  gap: 14px;
}

.player-time {
  min-width: 56px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
  color: #d8f1ff;
}

.player-slider {
  flex: 1;
  accent-color: #53b6ff;
}

.player-meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: rgba(239, 246, 255, 0.78);
}

.player-controls {
  flex-wrap: wrap;
}

.player-controls--full {
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.player-controls__left {
  min-width: 0;
}

.player-controls__right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.player-action {
  padding: 10px 14px;
  color: #eff6ff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(143, 207, 255, 0.18);
  border-radius: 14px;
}

.player-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.player-action--primary {
  background: linear-gradient(135deg, #1f8fff 0%, #1769d9 100%);
  border-color: rgba(143, 207, 255, 0.28);
}

.player-action--ghost {
  background: rgba(255, 255, 255, 0.04);
}

.player-action--active {
  background: rgba(31, 143, 255, 0.18);
  border-color: rgba(121, 199, 255, 0.48);
  box-shadow: inset 0 0 0 1px rgba(121, 199, 255, 0.2);
}

.player-speed {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(239, 246, 255, 0.78);
}

.player-select {
  padding: 8px 12px;
  color: #eff6ff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(143, 207, 255, 0.18);
  border-radius: 12px;
}

@media (max-width: 900px) {
  .player-bar__top,
  .player-progress {
    flex-direction: column;
    align-items: stretch;
  }

  .player-status-group {
    justify-content: flex-start;
  }

  .player-controls--full,
  .player-controls__right {
    justify-content: flex-start;
  }
}
</style>
