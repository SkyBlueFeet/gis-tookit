<script setup lang="ts">
import ReplayPlayerBar from "@/components/demo/ReplayPlayerBar.vue";
import ReplayRunDialog from "@/components/demo/ReplayRunDialog.vue";
import { useLeafletReplayMap } from "@/composables/useLeafletReplayMap";
import { useReplayPlayer } from "@/composables/useReplayPlayer";

// 地图相关能力单独封装，页面只持有 DOM 容器和 marker 更新入口。
const { mapContainer, upsertReplayMarkers } = useLeafletReplayMap();

// 播放器负责回放状态、轮询、控制按钮和 SSE 数据流。
const {
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
} = useReplayPlayer({
  onReplayMarkers: upsertReplayMarkers,
});
</script>

<template>
  <div class="leaflet-demo-page">
    <section class="leaflet-demo-map-shell">
      <!-- Leaflet 地图的真实挂载点 -->
      <div ref="mapContainer" class="leaflet-demo-map"></div>

      <div class="map-overlay">
        <!-- 播放器栏只负责展示和派发事件，不直接访问服务层 -->
        <ReplayPlayerBar
          v-model:replay-speed="replaySpeed"
          v-model:seek-preview-ms="seekPreviewMs"
          :selected-run-id="selectedRunId"
          :replay-state="replayStatusData?.state"
          :sse-status="sseStatus"
          :replay-busy="replayBusy"
          :replayed-count="replayStatusData?.replayedCount"
          :status-speed="replayStatusData?.speed"
          :replay-current-sim-time-ms="replayCurrentSimTimeMs"
          :replay-range-start-ms="replayRangeStartMs"
          :replay-range-end-ms="replayRangeEndMs"
          :replay-progress-percent="replayProgressPercent"
          @open-replay-list="openReplayList"
          @start-replay="startReplay"
          @pause-replay="pauseReplay"
          @resume-replay="resumeReplay"
          @stop-replay="stopReplay"
          @refresh-status="fetchReplayStatus"
          @update-replay-speed="updateReplaySpeed"
          @begin-seek-drag="beginSeekDrag"
          @apply-seek-preview="applySeekPreview"
        />
      </div>

      <!-- 回放列表弹窗和页面状态解耦，便于以后替换成抽屉或侧栏 -->
      <ReplayRunDialog
        v-model:run-limit="runLimit"
        :open="replayListOpen"
        :replay-busy="replayBusy"
        :replay-runs="replayRuns"
        :selected-run-id="selectedRunId"
        @close="closeReplayList"
        @refresh-runs="fetchReplayRuns"
        @select-run="selectReplayRun"
      />
    </section>
  </div>
</template>

<route lang="yaml">
name: leaflet-demo
path: /leaflet-demo
meta:
  layout: blank
</route>

<style scoped>
.leaflet-demo-page {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(219, 242, 255, 0.85), transparent 30%),
    linear-gradient(135deg, #081120 0%, #11243f 45%, #183357 100%);
}

.leaflet-demo-map-shell {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  padding: 20px;
}

.leaflet-demo-map {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  border-radius: 28px;
  box-shadow: 0 24px 80px rgba(2, 8, 18, 0.38);
}

.map-overlay {
  position: absolute;
  right: 20px;
  bottom: 20px;
  left: 20px;
  z-index: 2000;
  pointer-events: none;
}

@media (max-width: 900px) {
  .leaflet-demo-map-shell {
    padding: 12px;
  }

  .map-overlay {
    right: 12px;
    bottom: 12px;
    left: 12px;
  }
}
</style>
