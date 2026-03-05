<script setup>
defineProps({
  headerIcon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  maxWidth: {
    type: String,
    default: '1000px'
  }
})
</script>

<template>
  <div class="page-container">
    <div class="page-card" :style="{ maxWidth }">
      <div class="header">
        <div class="header-icon">{{ headerIcon }}</div>
        <h1 class="title">{{ title }}</h1>
        <p class="subtitle">{{ subtitle }}</p>
      </div>

      <div class="content">
        <slot />
      </div>
    </div>
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

.page-container {
  min-height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
}

.page-card {
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 0;
  width: 100%;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out;
  margin: 20px 0;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 50px 40px;
  text-align: center;
  color: white;
}

.header-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: fadeInUp 0.8s ease-out;
}

.title {
  font-size: 42px;
  font-weight: bold;
  margin: 0 0 15px 0;
  animation: fadeInUp 1s ease-out;
}

.subtitle {
  font-size: 18px;
  opacity: 0.95;
  margin: 0;
  animation: fadeInUp 1.2s ease-out;
}

.content {
  padding: 40px;
}

@media (max-width: 768px) {
  .header {
    padding: 40px 30px;
  }

  .title {
    font-size: 32px;
  }

  .subtitle {
    font-size: 16px;
  }

  .content {
    padding: 30px 20px;
  }
}
</style>
