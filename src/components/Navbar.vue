<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navItems = [
  { path: '/', label: '首页' },
  { path: '/about', label: '关于' },
  { path: '/build-info', label: '构建信息' },
  { path: '/demo', label: '演示' }
]

const isActive = (path) => {
  return route.path === path
}
</script>

<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-brand">Demo App</div>
      <div class="nav-links">
        <a
          v-for="item in navItems"
          :key="item.path"
          @click.prevent="router.push(item.path)"
          :class="['nav-link', { active: isActive(item.path) }]"
          href="#"
        >
          {{ item.label }}
        </a>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: #333;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.nav-link:hover {
  background: #f0f0f0;
  color: #667eea;
}

.nav-link.active {
  background: #667eea;
  color: white;
}
</style>