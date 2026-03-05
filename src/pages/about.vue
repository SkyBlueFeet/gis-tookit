<script setup>
import { useRouter } from 'vue-router'
import PageCard from '../components/PageCard.vue'
import SectionTitle from '../components/SectionTitle.vue'
import ActionButtons from '../components/ActionButtons.vue'
import TechCard from '../components/cards/TechCard.vue'
import FeatureCard from '../components/cards/FeatureCard.vue'

const router = useRouter()

const techStack = [
  { name: 'Vue 3', desc: '渐进式 JavaScript 框架', icon: '⚡' },
  { name: 'Vite', desc: '下一代前端构建工具', icon: '⚙️' },
  { name: 'Vue Router', desc: '官方路由管理器', icon: '🛣️' },
  { name: 'Pinia', desc: 'Vue 状态管理库', icon: '🍍' },
  { name: 'Cesium', desc: '三维地球和地图可视化库', icon: '🌍' },
  { name: 'vite-plugin-pages', desc: '约定式路由', icon: '📄' }
]

const features = [
  { title: '约定式路由配置', desc: '基于文件系统的自动路由生成', icon: '🔄' },
  { title: '状态管理集成', desc: 'Pinia 提供响应式状态管理', icon: '📦' },
  { title: '构建信息注入', desc: '自动注入版本和Git信息', icon: '🏷️' },
  { title: '三维地球可视化', desc: 'Cesium 驱动的3D地球展示', icon: '🗺️' }
]

const actionButtons = [
  { icon: '🏠', label: '返回首页', variant: 'primary', onClick: () => router.push('/') },
  { icon: 'ℹ️', label: '查看构建信息', variant: 'secondary', onClick: () => router.push('/build-info') }
]
</script>

<template>
  <PageCard
    header-icon="🚀"
    title="关于本应用"
    subtitle="基于 Vue 3 + Vite + Cesium 的现代化地球可视化应用"
  >
    <section class="section">
      <SectionTitle icon="💻" title="技术栈" />
      <div class="tech-grid">
        <TechCard
          v-for="(tech, index) in techStack"
          :key="tech.name"
          :icon="tech.icon"
          :name="tech.name"
          :description="tech.desc"
          :animation-delay="`${index * 0.1}s`"
        />
      </div>
    </section>

    <section class="section">
      <SectionTitle icon="✨" title="功能特性" />
      <div class="features-grid">
        <FeatureCard
          v-for="(feature, index) in features"
          :key="feature.title"
          :icon="feature.icon"
          :title="feature.title"
          :description="feature.desc"
          :animation-delay="`${index * 0.1}s`"
        />
      </div>
    </section>

    <ActionButtons :buttons="actionButtons" />
  </PageCard>
</template>

<route lang="yaml">
meta:
  layout: default
</route>

<style scoped>
.section {
  margin-bottom: 40px;
}

.section:last-of-type {
  margin-bottom: 0;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .tech-grid,
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>