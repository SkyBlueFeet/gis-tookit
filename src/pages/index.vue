<script setup>
import EarthViewer from '../components/EarthViewer.vue'
</script>

<template>
  <div class="index-page">
    <EarthViewer />
  </div>
</template>

<route lang="yaml">
meta:
  layout: blank
</route>

<style scoped>
.index-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
}
</style>
