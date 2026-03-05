<script setup>
// 这是一个全屏演示页面，使用空白布局
</script>

<template>
  <div class="fullscreen-demo">
    <div class="demo-content">
      <h1>全屏演示页面</h1>
      <p>这个页面使用空白布局（BlankLayout），没有导航栏，适合全屏展示内容。</p>
      <button @click="$router.push('/about')" class="demo-btn">
        前往关于页面（带导航栏）
      </button>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: blank
</route>

<style scoped>
.fullscreen-demo {
  width: 100%;
  height: 100vh;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
}

.demo-content {
  text-align: center;
  color: white;
  padding: 40px;
}

.demo-content h1 {
  font-size: 48px;
  margin-bottom: 20px;
}

.demo-content p {
  font-size: 20px;
  margin-bottom: 30px;
}

.demo-btn {
  padding: 15px 30px;
  font-size: 18px;
  background: white;
  color: #333;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.demo-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}
</style>
