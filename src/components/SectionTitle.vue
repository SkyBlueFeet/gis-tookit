<script setup>
defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  }
})
</script>

<template>
  <h2 class="section-title">
    <span class="title-icon">{{ icon }}</span>
    {{ title }}
  </h2>
</template>

<style scoped>
.section-title {
  font-size: 28px;
  color: #333;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 32px;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 24px;
  }
}
</style>
