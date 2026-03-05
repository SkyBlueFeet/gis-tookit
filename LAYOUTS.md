# 布局系统说明

本项目使用布局系统来管理不同页面的外观结构。

## 布局类型

### 1. DefaultLayout (默认布局)
- 位置：`src/layouts/DefaultLayout.vue`
- 包含：顶部导航栏 + 内容区域
- 适用于：大多数常规页面（关于、构建信息、404等）

### 2. BlankLayout (空白布局)
- 位置：`src/layouts/BlankLayout.vue`
- 包含：仅内容区域，无导航栏
- 适用于：需要全屏显示的页面（首页地球视图等）

## 如何使用

在页面组件中添加 `<route>` 块来指定布局：

```vue
<template>
  <!-- 页面内容 -->
</template>

<route lang="yaml">
meta:
  layout: default  # 或 blank
</route>
```

### 示例

**使用默认布局（带导航栏）：**
```vue
<!-- src/pages/about.vue -->
<template>
  <div class="about-container">
    <!-- 内容 -->
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
```

**使用空白布局（全屏）：**
```vue
<!-- src/pages/index.vue -->
<template>
  <div class="index-page">
    <EarthViewer />
  </div>
</template>

<route lang="yaml">
meta:
  layout: blank
</route>
```

## 当前页面布局配置

- `/` (首页) - BlankLayout（全屏地球视图）
- `/about` - DefaultLayout（带导航栏）
- `/build-info` - DefaultLayout（带导航栏）
- `/*` (404) - DefaultLayout（带导航栏）

## 添加新布局

1. 在 `src/layouts/` 目录下创建新的布局组件
2. 在 `src/App.vue` 中导入并注册新布局
3. 在页面的 `<route>` 块中使用新布局名称

## 布局切换逻辑

布局切换由 `App.vue` 中的逻辑控制：
- 读取路由的 `meta.layout` 属性
- 如果未指定，默认使用 `default` 布局
- 动态渲染对应的布局组件
