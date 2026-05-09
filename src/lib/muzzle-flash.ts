import * as Cesium from 'cesium';

export type LngLatPoint = [longitude: number, latitude: number, height?: number];
export type FlashPoint = Cesium.Cartesian3 | LngLatPoint;

export interface MuzzleFlashOptions {
  /** 效果总时长（毫秒） */
  durationMs?: number;
  /** 初始大小（像素） */
  startScale?: number;
  /** 峰值大小（像素） */
  peakScale?: number;
  /** 颜色 */
  color?: Cesium.Color;
  /** 最大透明度 */
  maxAlpha?: number;
  /** 亮度倍率 */
  brightness?: number;
  /** 与模型对齐时可加的偏移 */
  offset?: Cesium.Cartesian3;
}

export interface MuzzleFlashHandle {
  entity: Cesium.Entity;
  done: Promise<void>;
  clear: () => void;
}

const DEFAULT_OPTIONS: Required<MuzzleFlashOptions> = {
  durationMs: 160,
  startScale: 8,
  peakScale: 36,
  color: Cesium.Color.ORANGE,
  maxAlpha: 0.95,
  brightness: 1.4,
  offset: new Cesium.Cartesian3(0, 0, 0),
};

function toCartesian3(point: FlashPoint): Cesium.Cartesian3 {
  if (point instanceof Cesium.Cartesian3) {
    return Cesium.Cartesian3.clone(point);
  }

  const [longitude, latitude, height = 0] = point;
  return Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
}

function createFlashImage(size = 96): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  const center = size * 0.5;
  const radius = size * 0.5;

  const outer = ctx.createRadialGradient(center, center, 0, center, center, radius);
  outer.addColorStop(0.0, 'rgba(255,255,240,1)');
  outer.addColorStop(0.2, 'rgba(255,220,120,0.95)');
  outer.addColorStop(0.5, 'rgba(255,120,20,0.55)');
  outer.addColorStop(1.0, 'rgba(255,40,0,0)');

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

/**
 * 创建一个简单枪口火焰闪光效果（短时间放大 + 淡出）。
 */
export function createMuzzleFlash(
  viewer: Cesium.Viewer,
  point: FlashPoint,
  options: MuzzleFlashOptions = {},
): MuzzleFlashHandle {
  const cfg = { ...DEFAULT_OPTIONS, ...options };
  const position = Cesium.Cartesian3.add(
    toCartesian3(point),
    cfg.offset,
    new Cesium.Cartesian3(),
  );
  const startAt = performance.now();

  let isCleared = false;
  let resolveDone: (() => void) | undefined;
  let removePreRender: (() => void) | undefined;

  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const image = createFlashImage();
  const entity = viewer.entities.add({
    position,
    billboard: {
      image,
      width: cfg.startScale,
      height: cfg.startScale,
      color: cfg.color.withAlpha(0),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    },
  });

  const tick = (): void => {
    const elapsed = performance.now() - startAt;
    const t = Cesium.Math.clamp(elapsed / cfg.durationMs, 0, 1);
    const pulse = Math.sin(t * Math.PI);
    const width = Cesium.Math.lerp(cfg.startScale, cfg.peakScale, pulse);
    const alpha = Math.max(0, (1 - t) * pulse * cfg.maxAlpha);

    if (entity.billboard) {
      entity.billboard.width = new Cesium.ConstantProperty(width);
      entity.billboard.height = new Cesium.ConstantProperty(width);
      entity.billboard.color = new Cesium.ConstantProperty(cfg.color
        .brighten(cfg.brightness - 1, new Cesium.Color())
        .withAlpha(alpha));
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
    viewer.entities.remove(entity);
    resolveDone?.();
  };

  return {
    entity,
    done,
    clear,
  };
}

