<script setup>
import HoverCard from './HoverCard.vue'

defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: 'gradient'
  },
  animationDelay: {
    type: String,
    default: '0s'
  }
})
</script>

<template>
  <HoverCard :variant="variant" hover-effect="lift" :animation-delay="animationDelay">
    <div class="info-card-content">
      <div class="info-icon">{{ icon }}</div>
      <div class="info-text">
        <div class="info-label">{{ label }}</div>
        <div class="info-value">{{ value }}</div>
      </div>
    </div>
  </HoverCard>
</template>

<style scoped>
.info-card-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.info-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.info-text {
  flex: 1;
}

.info-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.info-value {
  font-size: 20px;
  color: #333;
  font-weight: 600;
  word-break: break-word;
}

@media (max-width: 768px) {
  .info-card-content {
    flex-direction: column;
    text-align: center;
  }

  .info-icon {
    font-size: 56px;
  }
}
</style>
