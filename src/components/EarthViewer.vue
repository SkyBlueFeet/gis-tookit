<template>
  <div ref="cesiumContainer"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as Cesium from 'cesium'

const cesiumContainer = ref(null)

onMounted(() => {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NDZjNjY2NS0xMmI2LTQ0MzYtYmI0Yi0zNDNhMDg2ZGM2OGMiLCJpZCI6MzM1NzIsImlhdCI6MTc0Mzc1NTA3Mn0.YHAKT14MificL4Y-zxKFSFV6sP56k_8hj1hTt6orZCs'

  const viewer = new Cesium.Viewer(cesiumContainer.value, {
    terrainProvider: Cesium.createWorldTerrain()
  })

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 10000000)
  })
})
</script>

<style scoped>
div {
  width: 100%;
  height: 100%;
}
</style>
