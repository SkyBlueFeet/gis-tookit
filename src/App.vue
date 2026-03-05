<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from './layouts/DefaultLayout.vue'
import BlankLayout from './layouts/BlankLayout.vue'

const route = useRoute()

// 根据路由元信息选择布局
const layout = computed(() => {
  return route.meta.layout || 'default'
})

const layoutComponent = computed(() => {
  return layout.value === 'blank' ? BlankLayout : DefaultLayout
})
</script>

<template>
  <component :is="layoutComponent">
    <router-view />
  </component>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
}

#app {
  width: 100%;
  min-height: 100%;
}
</style>
