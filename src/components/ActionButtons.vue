<script setup>
defineProps({
  buttons: {
    type: Array,
    required: true
  }
})
</script>

<template>
  <div class="actions">
    <button
      v-for="button in buttons"
      :key="button.label"
      @click="button.onClick"
      :class="['btn', `btn-${button.variant || 'primary'}`]"
    >
      <span class="btn-icon">{{ button.icon }}</span>
      {{ button.label }}
    </button>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  gap: 15px;
  margin-top: 40px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 14px 32px;
  font-size: 16px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #667eea;
  color: white;
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.btn-icon {
  font-size: 18px;
}

@media (max-width: 768px) {
  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
