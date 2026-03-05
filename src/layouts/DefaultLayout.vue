<script setup>
import Navbar from '../components/Navbar.vue'
</script>

<template>
  <div class="default-layout">
    <Navbar />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.default-layout {
  width: 100%;
  min-height: 100vh;
}

.main-content {
  width: 100%;
  min-height: calc(100vh - 60px);
  padding-top: 60px;
}
</style>
