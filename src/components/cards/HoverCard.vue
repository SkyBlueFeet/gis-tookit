<script setup>
defineProps({
  variant: {
    type: String,
    default: 'gradient', // gradient, border, solid
    validator: (value) => ['gradient', 'border', 'solid'].includes(value)
  },
  hoverEffect: {
    type: String,
    default: 'lift', // lift, slide, scale
    validator: (value) => ['lift', 'slide', 'scale', 'none'].includes(value)
  },
  animationDelay: {
    type: String,
    default: '0s'
  }
})
</script>

<template>
  <div
    :class="['hover-card', `variant-${variant}`, `hover-${hoverEffect}`]"
    :style="{ animationDelay }"
  >
    <slot />
  </div>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hover-card {
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out both;
}

/* Variants */
.variant-gradient {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.variant-border {
  background: white;
  border: 2px solid #e9ecef;
}

.variant-solid {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Hover Effects */
.hover-lift:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
}

.hover-slide:hover {
  transform: translateX(5px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.1);
}

.hover-slide.variant-border:hover {
  border-color: #667eea;
}

.hover-scale:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.hover-scale.variant-border:hover {
  border-color: #667eea;
}
</style>
