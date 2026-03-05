<script setup>
import HoverCard from './HoverCard.vue'

defineProps({
  icon: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  animationDelay: {
    type: String,
    default: '0s'
  }
})
</script>

<template>
  <HoverCard variant="gradient" hover-effect="lift" :animation-delay="animationDelay">
    <div class="tech-card-content">
      <div class="tech-icon">{{ icon }}</div>
      <div class="tech-info">
        <h3 class="tech-name">{{ name }}</h3>
        <p class="tech-desc">{{ description }}</p>
      </div>
    </div>
  </HoverCard>
</template>

<style scoped>
.tech-card-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.tech-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.tech-info {
  flex: 1;
}

.tech-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 5px 0;
}

.tech-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}
</style>
