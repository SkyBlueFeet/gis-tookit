<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageCard from '../components/PageCard.vue'
import SectionTitle from '../components/SectionTitle.vue'
import ActionButtons from '../components/ActionButtons.vue'
import InfoCard from '../components/cards/InfoCard.vue'
import HoverCard from '../components/cards/HoverCard.vue'

const router = useRouter()

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

const basicInfo = [
  { label: '应用名称', value: buildInfo.value.appName, icon: '📱' },
  { label: '版本号', value: buildInfo.value.version, icon: '🔖' },
  { label: '构建时间', value: formatDate(buildInfo.value.buildTime), icon: '⏰' }
]

const gitInfo = buildInfo.value.gitCommitHash !== 'N/A' ? [
  { label: '分支', value: buildInfo.value.gitBranch, icon: '🌿' },
  { label: '提交哈希', value: buildInfo.value.gitCommitShort, icon: '🔑' },
  { label: '完整哈希', value: buildInfo.value.gitCommitHash, icon: '🔐', isCode: true },
  { label: '提交时间', value: formatDate(buildInfo.value.gitCommitDate), icon: '📅' },
  { label: '提交信息', value: buildInfo.value.gitCommitMessage, icon: '💬' }
] : null

const actionButtons = [
  { icon: '🏠', label: '返回首页', variant: 'primary', onClick: () => router.push('/') },
  { icon: '📖', label: '关于应用', variant: 'secondary', onClick: () => router.push('/about') }
]
</script>

<template>
  <PageCard
    header-icon="📊"
    title="应用构建信息"
    subtitle="查看应用版本、构建时间和Git提交详情"
    max-width="900px"
  >
    <section class="section">
      <SectionTitle icon="ℹ️" title="基本信息" />
      <div class="info-grid">
        <InfoCard
          v-for="(info, index) in basicInfo"
          :key="info.label"
          :icon="info.icon"
          :label="info.label"
          :value="info.value"
          :animation-delay="`${index * 0.1}s`"
        />
      </div>
    </section>

    <section class="section" v-if="gitInfo">
      <SectionTitle icon="🔧" title="Git 信息" />
      <div class="git-info-list">
        <HoverCard
          v-for="(info, index) in gitInfo"
          :key="info.label"
          variant="border"
          hover-effect="slide"
          :animation-delay="`${(index + 3) * 0.1}s`"
        >
          <div class="git-info-header">
            <span class="git-icon">{{ info.icon }}</span>
            <span class="git-label">{{ info.label }}</span>
          </div>
          <div :class="['git-value', { 'code-value': info.isCode }]">
            {{ info.value }}
          </div>
        </HoverCard>
      </div>
    </section>

    <section class="section" v-else>
      <SectionTitle icon="🔧" title="Git 信息" />
      <div class="no-git-info">
        <div class="no-git-icon">⚠️</div>
        <p>当前项目不是 Git 仓库</p>
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.git-info-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.git-info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.git-icon {
  font-size: 24px;
}

.git-label {
  font-size: 14px;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.git-value {
  font-size: 16px;
  color: #333;
  padding-left: 34px;
  word-break: break-all;
  line-height: 1.6;
}

.code-value {
  font-family: 'Courier New', monospace;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-left: 0;
  padding-left: 16px;
  border-left: 4px solid #667eea;
}

.no-git-info {
  text-align: center;
  padding: 40px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe9e9 100%);
  border-radius: 12px;
  border: 2px dashed #ffc9c9;
}

.no-git-icon {
  font-size: 64px;
  margin-bottom: 15px;
}

.no-git-info p {
  font-size: 18px;
  color: #666;
  margin: 0;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .git-value {
    padding-left: 0;
    margin-top: 5px;
  }

  .code-value {
    padding-left: 16px;
  }
}
</style>