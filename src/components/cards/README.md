# 卡片组件库

这个目录包含了可复用的卡片组件，用于在整个应用中保持一致的视觉风格。

## 组件列表

### HoverCard（基础悬停卡片）

基础的卡片组件，提供不同的样式变体和悬停效果。

**Props:**
- `variant`: 样式变体 - `'gradient'` | `'border'` | `'solid'` (默认: `'gradient'`)
- `hoverEffect`: 悬停效果 - `'lift'` | `'slide'` | `'scale'` | `'none'` (默认: `'lift'`)
- `animationDelay`: 动画延迟 (默认: `'0s'`)

**使用示例:**
```vue
<HoverCard variant="border" hover-effect="slide" animation-delay="0.2s">
  <p>卡片内容</p>
</HoverCard>
```

### InfoCard（信息卡片）

用于显示图标、标签和值的信息卡片。

**Props:**
- `icon`: 图标（表情符号）
- `label`: 标签文本
- `value`: 值文本
- `variant`: 样式变体（继承自HoverCard）
- `animationDelay`: 动画延迟

**使用示例:**
```vue
<InfoCard
  icon="📱"
  label="应用名称"
  value="Demo App"
  animation-delay="0.1s"
/>
```

### TechCard（技术栈卡片）

用于展示技术栈信息的横向卡片。

**Props:**
- `icon`: 图标（表情符号）
- `name`: 技术名称
- `description`: 技术描述
- `animationDelay`: 动画延迟

**使用示例:**
```vue
<TechCard
  icon="⚡"
  name="Vue 3"
  description="渐进式 JavaScript 框架"
  animation-delay="0.1s"
/>
```

### FeatureCard（功能特性卡片）

用于展示功能特性的垂直卡片。

**Props:**
- `icon`: 图标（表情符号）
- `title`: 功能标题
- `description`: 功能描述
- `animationDelay`: 动画延迟

**使用示例:**
```vue
<FeatureCard
  icon="🔄"
  title="约定式路由配置"
  description="基于文件系统的自动路由生成"
  animation-delay="0.1s"
/>
```

## 导入方式

### 单独导入
```javascript
import HoverCard from '@/components/cards/HoverCard.vue'
import InfoCard from '@/components/cards/InfoCard.vue'
```

### 批量导入
```javascript
import { HoverCard, InfoCard, TechCard, FeatureCard } from '@/components/cards'
```

## 样式特性

所有卡片组件都包含：
- ✨ fadeInUp 进入动画
- 🎨 可配置的样式变体
- 🖱️ 平滑的悬停效果
- 📱 响应式设计
- ⏱️ 可配置的动画延迟

## 设计原则

1. **一致性**: 所有卡片使用统一的设计语言
2. **可复用**: 通过props配置不同的展示效果
3. **可扩展**: 易于添加新的变体和效果
4. **性能优化**: 使用CSS动画而非JavaScript
