import { onBeforeUnmount, onMounted, ref } from "vue";
import { LeafletMapController, type LeafletImageMarker, type LeafletLngLat } from "@/lib/leaflet";
import type { ReplayMarkerUpdate } from "@/composables/replay-types";

const initialPosition: LeafletLngLat = [121.4737, 31.2304];
const replayMarkerSize = {
  width: 40,
  height: 40,
};

export function useLeafletReplayMap() {
  // 由页面把这个 ref 绑定到 DOM，地图实例在 mounted 后创建。
  const mapContainer = ref<HTMLDivElement | null>(null);

  let mapController: LeafletMapController | null = null;
  let imageMarker: LeafletImageMarker | null = null;

  function upsertReplayMarkers(updates: ReplayMarkerUpdate[]): void {
    if (!mapController || updates.length === 0) {
      return;
    }

    for (const update of updates) {
      const marker = mapController.getImageMarker(update.id);
      if (marker) {
        // 已存在就原位更新，避免频繁销毁重建导致闪烁。
        marker.setPosition(update.position).setRotation(update.rotation);
        continue;
      }

      // 首次出现的目标创建独立 marker，并按消息来源打 class 便于后续区分样式。
      mapController.createImageMarker({
        id: update.id,
        position: update.position,
        imageUrl: import.meta.env.BASE_URL + "Military-Symbols/90053.png",
        size: replayMarkerSize,
        rotation: update.rotation,
        alt: update.id,
        className: `replay-marker replay-marker--${update.source}`,
        zIndexOffset: 200,
      });
    }
  }

  onMounted(() => {
    if (!mapContainer.value) {
      return;
    }

    // 当前 demo 页只负责提供基础底图，不在这里耦合播放器逻辑。
    mapController = new LeafletMapController({
      container: mapContainer.value,
      center: initialPosition,
      zoom: 11,
    });

    imageMarker = mapController.createImageMarker({
      id: "demo-asset",
      position: initialPosition,
      imageUrl: import.meta.env.BASE_URL + "Military-Symbols/90053.png",
      size: {
        width: 72,
        height: 72,
      },
      alt: "demo asset",
    });
  });

  onBeforeUnmount(() => {
    // 统一销毁地图实例，避免 Leaflet 在页面切换后残留事件和 DOM。
    imageMarker = null;
    mapController?.destroy();
    mapController = null;
  });

  return {
    mapContainer,
    upsertReplayMarkers,
  };
}
