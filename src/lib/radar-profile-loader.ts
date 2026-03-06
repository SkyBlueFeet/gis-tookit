/**
 * 雷达轮廓数据加载工具
 * 支持多种格式：JSON, CSV, GeoJSON
 */

export interface RadarProfileData {
  name?: string;
  description?: string;
  data: [number, number][];
}

/**
 * 从 JSON 文件加载雷达轮廓
 */
export async function loadProfileFromJSON(url: string, profileName: string = 'default'): Promise<[number, number][]> {
  const response = await fetch(url);
  const json = await response.json();

  if (json.profiles && json.profiles[profileName]) {
    return json.profiles[profileName].data;
  }

  throw new Error(`Profile "${profileName}" not found`);
}

/**
 * 从 CSV 文件加载雷达轮廓
 * CSV 格式: angle,distance
 */
export async function loadProfileFromCSV(url: string): Promise<[number, number][]> {
  const response = await fetch(url);
  const text = await response.text();

  const lines = text.split('\n').slice(1); // 跳过表头
  const data: [number, number][] = [];

  for (const line of lines) {
    const [angle, distance] = line.split(',').map(Number);
    if (!isNaN(angle) && !isNaN(distance)) {
      data.push([angle, distance]);
    }
  }

  return data;
}

/**
 * 从 GeoJSON 加载雷达轮廓
 * 假设坐标格式为 [angle, distance]
 */
export async function loadProfileFromGeoJSON(url: string): Promise<[number, number][]> {
  const response = await fetch(url);
  const geojson = await response.json();

  if (geojson.type === 'Feature' && geojson.geometry.type === 'Polygon') {
    return geojson.geometry.coordinates[0] as [number, number][];
  }

  if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
    const feature = geojson.features[0];
    if (feature.geometry.type === 'Polygon') {
      return feature.geometry.coordinates[0] as [number, number][];
    }
  }

  throw new Error('Invalid GeoJSON format');
}

/**
 * 创建圆形雷达轮廓
 */
export function createCircularProfile(radius: number = 300, segments: number = 36): [number, number][] {
  const data: [number, number][] = [];
  const angleStep = 360 / segments;

  for (let i = 0; i < segments; i++) {
    data.push([i * angleStep, radius]);
  }

  return data;
}

/**
 * 创建扇形雷达轮廓
 */
export function createSectorProfile(
  startAngle: number = 0,
  endAngle: number = 120,
  radius: number = 300,
  segments: number = 12
): [number, number][] {
  const data: [number, number][] = [[startAngle, 0]];
  const angleStep = (endAngle - startAngle) / segments;

  for (let i = 0; i <= segments; i++) {
    data.push([startAngle + i * angleStep, radius]);
  }

  data.push([endAngle, 0]);
  return data;
}

/**
 * 将雷达轮廓导出为 GeoJSON
 */
export function exportToGeoJSON(
  profileData: [number, number][],
  properties: Record<string, any> = {}
): object {
  return {
    type: 'Feature',
    properties: {
      name: 'Radar Coverage Pattern',
      unit: 'relative',
      ...properties
    },
    geometry: {
      type: 'Polygon',
      coordinates: [profileData]
    }
  };
}

/**
 * 将雷达轮廓导出为 CSV
 */
export function exportToCSV(profileData: [number, number][]): string {
  let csv = 'angle,distance\n';
  for (const [angle, distance] of profileData) {
    csv += `${angle},${distance}\n`;
  }
  return csv;
}
