<template>
    <div ref="cesiumContainer" class="earth-viewer"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import * as Cesium from "cesium";
import { exampleUsage2 } from "@/lib/geoserver-example";
import { createDirectionalShotLine } from "@/lib/directional-shot-line";
import { createMuzzleFlashNoise } from "@/lib/muzzle-flash-noise";

const cesiumContainer = ref(null);
let viewer = null;

const PUBLISH_BASE = import.meta.env.VITE_PUBLISH_BASE || "";

function buildPublishUrl(path) {
    return `${PUBLISH_BASE}${path}`;
}

async function loadPublishLayers(targetViewer) {
    const response = await fetch(buildPublishUrl("/layers"));
    if (!response.ok) {
        throw new Error(`load publish layers failed: ${response.status}`);
    }

    const layers = await response.json();
    if (!Array.isArray(layers)) {
        throw new Error("invalid publish layers payload");
    }


    layers.forEach((layer) => {
        if (!layer?.id) {
            return;
        }

        const provider = new Cesium.UrlTemplateImageryProvider({
            url: buildPublishUrl(
                `/${encodeURIComponent(layer.id)}/xyz/{z}/{x}/{y}.png`,
            ),
            minimumLevel: Number.isInteger(layer.minZoom) ? layer.minZoom : 0,
            maximumLevel: Number.isInteger(layer.maxZoom) ? layer.maxZoom : 22,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            credit: `publish:${layer.id}`,
        });

        targetViewer.imageryLayers.addImageryProvider(provider);
    });
}

onMounted(async () => {
    Cesium.Ion.defaultAccessToken =
        import.meta.env.VITE_CESIUM_ION_TOKEN ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NDZjNjY2NS0xMmI2LTQ0MzYtYmI0Yi0zNDNhMDg2ZGM2OGMiLCJpZCI6MzM1NzIsImlhdCI6MTc0Mzc1NTA3Mn0.YHAKT14MificL4Y-zxKFSFV6sP56k_8hj1hTt6orZCs";

    viewer = new Cesium.Viewer(cesiumContainer.value, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        imageryProvider: new Cesium.UrlTemplateImageryProvider({
            url: `${import.meta.env.BASE_URL}earth-theme/Theme02/{z}/{x}/{y}.jpg`,
            maximumLevel: 4,
            minimumLevel: 0,
            tilingScheme: new Cesium.GeographicTilingScheme()
        }), // Bing Maps Aerial
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,

    });



    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 50000),
        complete: () => {
            createMuzzleFlashNoise(viewer, Cesium.Cartesian3.fromDegrees(116.3, 39.9, 2000), {
                startRadiusPx: 2,
                peakRadiusPx: 6,
                brightness: 2.8,
                durationMs: 240,
                noiseScale: 12,
                edgeJitter: 0.6,
                edgeScaleMax: 3,
                color: Cesium.Color.RED.withAlpha(0.85),
            });
            createDirectionalShotLine(viewer,
                Cesium.Cartesian3.fromDegrees(116.3, 39.9, 2000),
                Cesium.Cartesian3.fromDegrees(116.5, 39.9, 2000), { holdDurationMs: 1000, headWidth: 8, tailWidth: 2, taperSegments: 50, color: Cesium.Color.RED.withAlpha(0.4) });
        },
    });
    exampleUsage2(viewer);
});

onBeforeUnmount(() => {
    if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
    }
    viewer = null;
});
</script>

<style scoped>
.earth-viewer {
    width: 100%;
    height: 100%;
}
</style>
