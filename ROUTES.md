# 约定式路由说明

本项目使用 `vite-plugin-pages` 实现约定式路由。

## 路由结构

```
src/pages/
├── index.vue           → /
├── about.vue           → /about
├── build-info.vue      → /build-info
└── [...all].vue        → /* (404页面，匹配所有未定义的路由)
```

## 路由命名规则

- `index.vue` - 根路径 `/`
- `about.vue` - `/about`
- `build-info.vue` - `/build-info`
- `[...all].vue` - 捕获所有未匹配的路由（404页面）

## 添加新页面

只需在 `src/pages/` 目录下创建新的 `.vue` 文件，路由会自动生成：

- `src/pages/contact.vue` → `/contact`
- `src/pages/user/profile.vue` → `/user/profile`
- `src/pages/[id].vue` → `/:id` (动态路由)

## 现有页面

1. **首页** (`/`) - 地球可视化页面
2. **关于** (`/about`) - 应用介绍页面
3. **构建信息** (`/build-info`) - 显示应用版本和构建信息
4. **404页面** - 所有未定义的路由都会显示404页面
