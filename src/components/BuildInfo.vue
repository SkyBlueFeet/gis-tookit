<script setup>
import { ref, onMounted } from 'vue'

const buildInfo = ref({
  appName: __APP_NAME__,
  version: __APP_VERSION__,
  buildTime: __BUILD_TIME__,
  gitCommitHash: __GIT_COMMIT_HASH__,
  gitCommitShort: __GIT_COMMIT_SHORT__,
  gitBranch: __GIT_BRANCH__,
  gitCommitDate: __GIT_COMMIT_DATE__,
  gitCommitMessage: __GIT_COMMIT_MESSAGE__,
})

const formatDate = (dateString) => {
  if (dateString === 'N/A') return dateString
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<template>
  <div class="build-info-container">
    <div class="build-info-card">
      <h1 class="title">应用构建信息</h1>

      <div class="info-section">
        <h2>基本信息</h2>
        <div class="info-item">
          <span class="label">应用名称：</span>
          <span class="value">{{ buildInfo.appName }}</span>
        </div>
        <div class="info-item">
          <span class="label">版本号：</span>
          <span class="value">{{ buildInfo.version }}</span>
        </div>
        <div class="info-item">
          <span class="label">构建时间：</span>
          <span class="value">{{ formatDate(buildInfo.buildTime) }}</span>
        </div>
      </div>

      <div class="info-section" v-if="buildInfo.gitCommitHash !== 'N/A'">
        <h2>Git 信息</h2>
        <div class="info-item">
          <span class="label">分支：</span>
          <span class="value">{{ buildInfo.gitBranch }}</span>
        </div>
        <div class="info-item">
          <span class="label">提交哈希：</span>
          <span class="value">{{ buildInfo.gitCommitShort }}</span>
        </div>
        <div class="info-item">
          <span class="label">完整哈希：</span>
          <span class="value code">{{ buildInfo.gitCommitHash }}</span>
        </div>
        <div class="info-item">
          <span class="label">提交时间：</span>
          <span class="value">{{ formatDate(buildInfo.gitCommitDate) }}</span>
        </div>
        <div class="info-item">
          <span class="label">提交信息：</span>
          <span class="value">{{ buildInfo.gitCommitMessage }}</span>
        </div>
      </div>

      <div class="info-section" v-else>
        <h2>Git 信息</h2>
        <div class="info-item">
          <span class="value">当前项目不是 Git 仓库</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.build-info-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.build-info-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  max-width: 800px;
  width: 100%;
}

.title {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 30px;
  text-align: center;
}

.info-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-section h2 {
  font-size: 20px;
  color: #667eea;
  margin-bottom: 15px;
  font-weight: 600;
}

.info-item {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid #e9ecef;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #495057;
  min-width: 120px;
}

.value {
  color: #212529;
  flex: 1;
  word-break: break-all;
}

.value.code {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 4px;
}
</style>
