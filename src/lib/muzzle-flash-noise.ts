import * as Cesium from 'cesium';

export type LngLatPoint = [longitude: number, latitude: number, height?: number];
export type FlashPoint = Cesium.Cartesian3 | LngLatPoint;

export interface MuzzleFlashNoiseOptions {
  /** 效果总时长（毫秒） */
  durationMs?: number;
  /** 固定半径（像素），不设置 start/peak 时生效 */
  radiusPx?: number;
  /** 起始半径（像素） */
  startRadiusPx?: number;
  /** 峰值半径（像素） */
  peakRadiusPx?: number;
  /** 兼容旧参数名：起始尺寸（像素） */
  startScale?: number;
  /** 兼容旧参数名：峰值尺寸（像素） */
  peakScale?: number;
  /** 主颜色 */
  color?: Cesium.Color;
  /** 最大透明度 */
  maxAlpha?: number;
  /** 峰值亮度倍率 */
  brightness?: number;
  /** 噪声频率 */
  noiseScale?: number;
  /** 边缘扰动幅度，建议 0~1 */
  edgeJitter?: number;
  /** 边缘长度范围最小倍率（相对半径） */
  edgeScaleMin?: number;
  /** 边缘长度范围最大倍率（相对半径） */
  edgeScaleMax?: number;
  /** 角向扇区数量，越大越碎 */
  edgeSectors?: number;
  /** 与模型对齐时可加的偏移 */
  offset?: Cesium.Cartesian3;
}

export interface MuzzleFlashNoiseHandle {
  stage: Cesium.PostProcessStage;
  done: Promise<void>;
  clear: () => void;
}

const DEFAULT_OPTIONS: Required<MuzzleFlashNoiseOptions> = {
  durationMs: 180,
  radiusPx: 42,
  startRadiusPx: 20,
  peakRadiusPx: 52,
  startScale: 20,
  peakScale: 52,
  color: Cesium.Color.ORANGE,
  maxAlpha: 0.95,
  brightness: 1.8,
  noiseScale: 8,
  edgeJitter: 0.32,
  edgeScaleMin: 0.78,
  edgeScaleMax: 1.24,
  edgeSectors: 13,
  offset: new Cesium.Cartesian3(0, 0, 0),
};

const MATERIAL_TYPE = 'MuzzleNoiseFlashPost';

function toCartesian3(point: FlashPoint): Cesium.Cartesian3 {
  if (point instanceof Cesium.Cartesian3) {
    return Cesium.Cartesian3.clone(point);
  }

  const [longitude, latitude, height = 0] = point;
  return Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
}

function createFragmentShader(): string {
  return `
uniform sampler2D colorTexture;
varying vec2 v_textureCoordinates;

uniform vec2 u_center;
uniform vec2 u_viewport;
uniform float u_radiusPx;
uniform float u_time;
uniform vec3 u_color;
uniform float u_maxAlpha;
uniform float u_brightness;
uniform float u_noiseScale;
uniform float u_edgeJitter;
uniform float u_edgeScaleMin;
uniform float u_edgeScaleMax;
uniform float u_edgeSectors;
uniform float u_seed;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec4 src = texture2D(colorTexture, v_textureCoordinates);
  vec2 delta = v_textureCoordinates - u_center;
  vec2 deltaPx = delta * u_viewport;
  float distPx = length(deltaPx);

  float pulse = sin(clamp(u_time, 0.0, 1.0) * 3.1415926);
  float fade = (1.0 - u_time);
  float life = max(0.0, pulse * fade);

  float n = noise((deltaPx / max(min(u_viewport.x, u_viewport.y), 1.0)) * u_noiseScale * 32.0 + vec2(u_seed, u_time * 11.0));
  float edge = u_radiusPx * (1.0 + (n - 0.5) * u_edgeJitter);

  // 角向范围取值：每个方向的边缘长度在 [u_edgeScaleMin, u_edgeScaleMax] 内变化
  float angle = atan(deltaPx.y, deltaPx.x);
  float angle01 = (angle + 3.1415926) / 6.2831852;
  float sectors = max(1.0, u_edgeSectors);
  float sectorId = floor(angle01 * sectors);
  float sectorRand = hash(vec2(sectorId + u_seed, 23.17));
  float bandNoise = noise(vec2(angle01 * sectors * 1.7 + u_seed * 0.13, u_seed * 0.07));
  float rangeMix = clamp(sectorRand * 0.7 + bandNoise * 0.3, 0.0, 1.0);
  float rangeScale = mix(u_edgeScaleMin, u_edgeScaleMax, rangeMix);
  edge *= rangeScale;

  float core = 1.0 - smoothstep(edge * 0.62, edge, distPx);

  float alpha = core * life * u_maxAlpha;
  vec3 glow = u_color * alpha * (u_brightness + core * 0.8);
  gl_FragColor = vec4(src.rgb + glow, src.a);
}
`;
}

/**
 * 使用屏幕后处理 shader 创建不规则枪口闪光。
 * 这是一个短时效果，适合在开火瞬间叠加。
 */
export function createMuzzleFlashNoise(
  viewer: Cesium.Viewer,
  point: FlashPoint,
  options: MuzzleFlashNoiseOptions = {},
): MuzzleFlashNoiseHandle {
  const cfg = { ...DEFAULT_OPTIONS, ...options };
  const worldPoint = Cesium.Cartesian3.add(
    toCartesian3(point),
    cfg.offset,
    new Cesium.Cartesian3(),
  );
  const startAt = performance.now();
  const seed = Math.random() * 1000;

  let isCleared = false;
  let resolveDone: (() => void) | undefined;
  let removePreRender: (() => void) | undefined;
  let normalizedCenter = new Cesium.Cartesian2(0.5, 0.5);
  let viewportSize = new Cesium.Cartesian2(1, 1);
  let currentRadiusPx = cfg.radiusPx;
  let normalizedTime = 0;
  const hasCustomStart =
    options.startRadiusPx !== undefined || options.startScale !== undefined;
  const hasCustomPeak =
    options.peakRadiusPx !== undefined || options.peakScale !== undefined;

  let startRadiusPx: number;
  let peakRadiusPx: number;
  if (hasCustomStart || hasCustomPeak) {
    startRadiusPx = options.startRadiusPx ?? options.startScale ?? cfg.startRadiusPx;
    peakRadiusPx = options.peakRadiusPx ?? options.peakScale ?? cfg.peakRadiusPx;
  } else if (options.radiusPx !== undefined) {
    // 仅传 radiusPx 时，使用固定半径，不做峰值扩张
    startRadiusPx = options.radiusPx;
    peakRadiusPx = options.radiusPx;
  } else {
    startRadiusPx = cfg.startRadiusPx;
    peakRadiusPx = cfg.peakRadiusPx;
  }

  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const stage = new Cesium.PostProcessStage({
    name: `${MATERIAL_TYPE}-${Date.now()}-${Math.floor(seed)}`,
    fragmentShader: createFragmentShader(),
    uniforms: {
      u_center: () => normalizedCenter,
      u_viewport: () => viewportSize,
      u_radiusPx: () => currentRadiusPx,
      u_time: () => normalizedTime,
      u_color: () => new Cesium.Cartesian3(cfg.color.red, cfg.color.green, cfg.color.blue),
      u_maxAlpha: cfg.maxAlpha,
      u_brightness: cfg.brightness,
      u_noiseScale: cfg.noiseScale,
      u_edgeJitter: cfg.edgeJitter,
      u_edgeScaleMin: Math.min(cfg.edgeScaleMin, cfg.edgeScaleMax),
      u_edgeScaleMax: Math.max(cfg.edgeScaleMin, cfg.edgeScaleMax),
      u_edgeSectors: Math.max(1, Math.floor(cfg.edgeSectors)),
      u_seed: seed,
    },
  });

  viewer.scene.postProcessStages.add(stage);

  const tick = (): void => {
    const elapsed = performance.now() - startAt;
    const t = Cesium.Math.clamp(elapsed / cfg.durationMs, 0, 1);
    normalizedTime = t;

    const scene = viewer.scene;
    const windowPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, worldPoint);
    if (!windowPosition) {
      normalizedCenter = new Cesium.Cartesian2(-10, -10);
    } else {
      const width = Math.max(scene.canvas.width, 1);
      const height = Math.max(scene.canvas.height, 1);
      viewportSize = new Cesium.Cartesian2(width, height);
      normalizedCenter = new Cesium.Cartesian2(
        windowPosition.x / width,
        1 - windowPosition.y / height,
      );
      const pulse = Math.sin(t * Math.PI);
      currentRadiusPx = Cesium.Math.lerp(startRadiusPx, peakRadiusPx, pulse);
    }

    if (t >= 1) {
      clear();
    }
  };

  removePreRender = viewer.scene.preRender.addEventListener(tick);

  const clear = (): void => {
    if (isCleared) {
      return;
    }
    isCleared = true;

    if (removePreRender) {
      removePreRender();
    }
    if (!stage.isDestroyed()) {
      viewer.scene.postProcessStages.remove(stage);
    }
    resolveDone?.();
  };

  return {
    stage,
    done,
    clear,
  };
}
