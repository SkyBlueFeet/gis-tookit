<script setup>
import HoverCard from './HoverCard.vue'

defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
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
  <HoverCard variant="border" hover-effect="lift" :animation-delay="animationDelay">
    <div class="feature-card-content">
      <div class="feature-icon">{{ icon }}</div>
      <h3 class="feature-title">{{ title }}</h3>
      <p class="feature-desc">{{ description }}</p>
    </div>
  </HoverCard>
</template>

<style scoped>
.feature-card-content {
  text-align: center;
  padding: 5px;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.feature-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 10px 0;
}

.feature-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}
</style>
