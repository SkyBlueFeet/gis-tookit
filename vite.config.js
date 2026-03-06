import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'
import Pages from 'vite-plugin-pages'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 获取package.json版本信息
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// 获取git信息（如果是git仓库）
let gitCommitHash = 'N/A'
let gitCommitShort = 'N/A'
let gitBranch = 'N/A'
let gitCommitDate = 'N/A'
let gitCommitMessage = 'N/A'

try {
  gitCommitHash = execSync('git rev-parse HEAD').toString().trim()
  gitCommitShort = execSync('git rev-parse --short HEAD').toString().trim()
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  gitCommitDate = execSync('git log -1 --format=%ai').toString().trim()
  gitCommitMessage = execSync('git log -1 --format=%s').toString().trim()
} catch (e) {
  console.log('Not a git repository or git not available')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    cesium(),
    Pages({
      dirs: 'src/pages',
      extensions: ['vue'],
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_NAME__: JSON.stringify(packageJson.name),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT_HASH__: JSON.stringify(gitCommitHash),
    __GIT_COMMIT_SHORT__: JSON.stringify(gitCommitShort),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
    __GIT_COMMIT_DATE__: JSON.stringify(gitCommitDate),
    __GIT_COMMIT_MESSAGE__: JSON.stringify(gitCommitMessage),
  }
})
