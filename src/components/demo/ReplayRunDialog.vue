<script setup lang="ts">
import type { ReplayRunRecord } from "@/composables/replay-types";
import { formatSimTime } from "@/composables/replay-utils";

interface Props {
  open: boolean;
  replayBusy: string | null;
  replayRuns: ReplayRunRecord[];
  selectedRunId: string;
}

defineProps<Props>();

// 列表条数由父层持有，这样弹窗关闭后输入值还能保留。
const runLimit = defineModel<string>("runLimit", {
  required: true,
});

defineEmits<{
  close: [];
  refreshRuns: [];
  selectRun: [runId: string];
}>();
</script>

<template>
  <transition name="dialog-fade">
    <!-- 点击遮罩关闭，但点击卡片内部不关闭 -->
    <div v-if="open" class="dialog-backdrop" @click.self="$emit('close')">
      <div class="dialog-card">
        <div class="dialog-card__header">
          <div>
            <p class="floating-panel__eyebrow">Replay List</p>
            <h2>选择回放记录</h2>
          </div>
          <button class="floating-panel__close" type="button" aria-label="关闭回放列表" @click="$emit('close')">
            x
          </button>
        </div>

        <div class="dialog-toolbar">
          <label class="field">
            <span class="field-label">列表条数</span>
            <input v-model="runLimit" class="sse-input" type="number" min="1" max="200" />
          </label>
          <button class="player-action player-action--ghost" :disabled="!!replayBusy" @click="$emit('refreshRuns')">
            刷新列表
          </button>
        </div>

        <div class="run-list run-list--dialog">
          <!-- 每个 run 只负责“选中”，实际播放仍由播放器栏控制 -->
          <button
            v-for="run in replayRuns"
            :key="run.runId"
            class="run-item"
            :class="{ 'run-item--active': selectedRunId === run.runId }"
            @click="$emit('selectRun', run.runId)"
          >
            <span class="run-item__title">{{ run.runId }}</span>
            <span class="run-item__meta">
              {{ run.status }} · {{ run.recordCount }} 条 · {{ formatSimTime(run.lastSimTimeMs) }}
            </span>
          </button>
          <p v-if="replayRuns.length === 0" class="empty-text">暂无回放记录，可先点击“刷新列表”。</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.dialog-backdrop {
  position: absolute;
  inset: 0;
  z-index: 2200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(2, 8, 18, 0.42);
  backdrop-filter: blur(8px);
}

.dialog-card {
  width: min(640px, 100%);
  max-height: min(80vh, 760px);
  display: grid;
  gap: 16px;
  padding: 20px;
  overflow: auto;
  color: #eff6ff;
  background: rgba(6, 15, 29, 0.94);
  border: 1px solid rgba(143, 207, 255, 0.22);
  border-radius: 24px;
  box-shadow: 0 26px 60px rgba(1, 7, 16, 0.42);
  pointer-events: auto;
}

.dialog-card__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.dialog-card__header h2 {
  margin: 2px 0 0;
  font-size: 22px;
  text-align: left;
}

.floating-panel__eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #79c7ff;
}

.floating-panel__close {
  width: 36px;
  height: 36px;
  color: #eff6ff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(143, 207, 255, 0.18);
  border-radius: 999px;
}

.dialog-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field-label,
.empty-text,
.run-item__meta {
  font-size: 12px;
  color: rgba(239, 246, 255, 0.72);
}

.sse-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  color: #eff6ff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(143, 207, 255, 0.28);
  border-radius: 14px;
  outline: none;
}

.run-list {
  display: grid;
  gap: 10px;
  max-height: 220px;
  margin: 14px 0;
  overflow: auto;
}

.run-item {
  display: grid;
  gap: 4px;
  padding: 12px;
  text-align: left;
  color: #eaf6ff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(143, 207, 255, 0.18);
  border-radius: 14px;
}

.run-item--active {
  border-color: #79c7ff;
  background: rgba(31, 143, 255, 0.18);
}

.run-item__title {
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
  word-break: break-all;
}

.empty-text {
  margin: 0;
  text-align: left;
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

.player-action--ghost {
  background: rgba(255, 255, 255, 0.04);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@media (max-width: 900px) {
  .dialog-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
