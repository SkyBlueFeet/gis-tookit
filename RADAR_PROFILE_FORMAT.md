# 雷达轮廓数据格式说明

## 支持的格式

### 1. JSON 格式（推荐）

```json
{
  "profiles": {
    "default": {
      "name": "默认雷达轮廓",
      "description": "标准雷达覆盖范围",
      "data": [
        [0, 215],
        [0.3, 230],
        [0.4, 240]
      ]
    }
  }
}
```

### 2. CSV 格式

```csv
angle,distance
0,215
0.3,230
0.4,240
```

### 3. GeoJSON 格式

```json
{
  "type": "Feature",
  "properties": {
    "name": "Radar Coverage Pattern",
    "unit": "relative"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [0, 215],
      [0.3, 230],
      [0.4, 240]
    ]
  }
}
```

## 使用示例

### 方式 1: 直接传入数据

```typescript
import { RadarPrimitive } from '@/lib/radar-core';

const radar = new RadarPrimitive({
  position: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000),
  radius: 20,
  profileData: [
    [0, 215],
    [0.3, 230],
    [0.4, 240],
    // ... 更多点
  ]
}, Cesium);
```

### 方式 2: 从 JSON 文件加载

```typescript
import { RadarPrimitive } from '@/lib/radar-core';
import { loadProfileFromJSON } from '@/lib/radar-profile-loader';

// 加载轮廓数据
const profileData = await loadProfileFromJSON('/radar-profiles.json', 'circular');

const radar = new RadarPrimitive({
  position: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000),
  radius: 20,
  profileData: profileData
}, Cesium);
```

### 方式 3: 从 CSV 文件加载

```typescript
import { loadProfileFromCSV } from '@/lib/radar-profile-loader';

const profileData = await loadProfileFromCSV('/radar-profile.csv');

const radar = new RadarPrimitive({
  position: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000),
  radius: 20,
  profileData: profileData
}, Cesium);
```

### 方式 4: 使用预定义形状

```typescript
import { createCircularProfile, createSectorProfile } from '@/lib/radar-profile-loader';

// 圆形覆盖
const circularData = createCircularProfile(300, 36);

// 扇形覆盖（0-120度）
const sectorData = createSectorProfile(0, 120, 300, 12);

const radar = new RadarPrimitive({
  position: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000),
  radius: 20,
  profileData: circularData
}, Cesium);
```

## 导出轮廓数据

```typescript
import { exportToGeoJSON, exportToCSV } from '@/lib/radar-profile-loader';

const profileData: [number, number][] = [
  [0, 215],
  [0.3, 230],
  // ...
];

// 导出为 GeoJSON
const geojson = exportToGeoJSON(profileData, {
  name: 'My Radar Pattern',
  type: 'surveillance'
});
console.log(JSON.stringify(geojson, null, 2));

// 导出为 CSV
const csv = exportToCSV(profileData);
console.log(csv);
```

## 数据格式说明

- **angle**: 角度（度），范围 0-360
- **distance**: 距离（相对单位），会根据 `radius` 参数缩放
- 数据点按角度顺序排列
- 系统会自动闭合轮廓（首尾相连）

## 在线编辑工具

你可以使用以下工具编辑雷达轮廓：

1. **GeoJSON.io** - 可视化编辑 GeoJSON
2. **Excel/Google Sheets** - 编辑 CSV 格式
3. **任何文本编辑器** - 编辑 JSON 格式
