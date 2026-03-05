<script setup>
// 空白布局，不包含导航栏，适用于全屏页面
</script>

<template>
  <div class="blank-layout">
    <slot />
  </div>
</template>

<style scoped>
.blank-layout {
  width: 100%;
  height: 100%;
}
</style>
