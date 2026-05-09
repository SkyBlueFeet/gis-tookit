import * as Cesium from 'cesium';

export type LngLatPoint = [longitude: number, latitude: number, height?: number];
export type ShotPoint = Cesium.Cartesian3 | LngLatPoint;

export interface DirectionalShotLineOptions {
  /** 线从 A 点射到 B 点的时长（毫秒） */
  flyDurationMs?: number;
  /** 完成后停留时长（毫秒） */
  holdDurationMs?: number;
  /** 终点细线宽度（B 点方向） */
  tailWidth?: number;
  /** 起点粗线宽度（A 点方向） */
  headWidth?: number;
  /** 粗线段占当前总长度比例，范围 0~1 */
  headRatio?: number;
  /** 粗细平滑过渡的分段数，越大越平滑 */
  taperSegments?: number;
  /** 线颜色 */
  color?: Cesium.Color;
  /** 是否贴地 */
  clampToGround?: boolean;
}

export interface DirectionalShotLineHandle {
  tailEntity: Cesium.Entity;
  headEntity: Cesium.Entity;
  taperEntities: Cesium.Entity[];
  done: Promise<void>;
  clear: () => void;
}

const DEFAULT_OPTIONS: Required<DirectionalShotLineOptions> = {
  flyDurationMs: 600,
  holdDurationMs: 2000,
  tailWidth: 4,
  headWidth: 10,
  headRatio: 0.2,
  taperSegments: 10,
  color: Cesium.Color.CYAN,
  clampToGround: false,
};

function toCartesian3(point: ShotPoint): Cesium.Cartesian3 {
  if (point instanceof Cesium.Cartesian3) {
    return Cesium.Cartesian3.clone(point);
  }

  const [longitude, latitude, height = 0] = point;
  return Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
}

function lerpCartesian3(
  start: Cesium.Cartesian3,
  end: Cesium.Cartesian3,
  t: number,
): Cesium.Cartesian3 {
  return Cesium.Cartesian3.lerp(start, end, Cesium.Math.clamp(t, 0, 1), new Cesium.Cartesian3());
}

/**
 * 创建一个“从 A 点快速射向 B 点”的方向线效果。
 * 通过“起点粗、终点细”的锥形线展示方向，支持飞行时长与停留时长配置。
 */
export function createDirectionalShotLine(
  viewer: Cesium.Viewer,
  startPoint: ShotPoint,
  endPoint: ShotPoint,
  options: DirectionalShotLineOptions = {},
): DirectionalShotLineHandle {
  const cfg = { ...DEFAULT_OPTIONS, ...options };
  const start = toCartesian3(startPoint);
  const end = toCartesian3(endPoint);
  const launchAt = performance.now();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let isCleared = false;
  let resolveDone: (() => void) | undefined;

  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const getProgress = (): number => {
    const elapsed = performance.now() - launchAt;
    return Cesium.Math.clamp(elapsed / cfg.flyDurationMs, 0, 1);
  };
  const taperSegments = Math.max(2, Math.floor(cfg.taperSegments));
  const taperEntities: Cesium.Entity[] = [];
  for (let i = 0; i < taperSegments; i += 1) {
    const t0 = i / taperSegments;
    const t1 = (i + 1) / taperSegments;
    const tm = (t0 + t1) * 0.5;
    const segmentWidth = Cesium.Math.lerp(cfg.headWidth, cfg.tailWidth, tm);

    const entity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const p = getProgress();
          const visibleP = Math.max(0, p);
          if (visibleP <= 0) {
            return [start, start];
          }

          const segStartP = visibleP * t0;
          const segEndP = visibleP * t1;
          const segStart = lerpCartesian3(start, end, segStartP);
          const segEnd = lerpCartesian3(start, end, segEndP);
          return [segStart, segEnd];
        }, false),
        width: segmentWidth,
        material: cfg.color,
        clampToGround: cfg.clampToGround,
      },
    });

    taperEntities.push(entity);
  }

  const tailEntity = taperEntities[taperEntities.length - 1];
  const headEntity = taperEntities[0];

  const clear = (): void => {
    if (isCleared) {
      return;
    }

    isCleared = true;
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    viewer.entities.remove(tailEntity);
    for (const entity of taperEntities) {
      viewer.entities.remove(entity);
    }
    resolveDone?.();
  };

  timeoutId = setTimeout(() => {
    clear();
  }, cfg.flyDurationMs + cfg.holdDurationMs);

  return {
    tailEntity,
    headEntity,
    taperEntities,
    done,
    clear,
  };
}

/**
 * 使用示例：
 * createDirectionalShotLine(viewer, [116.39, 39.90, 300], [121.47, 31.23, 300], {
 *   flyDurationMs: 500,
 *   holdDurationMs: 3000,
 *   color: Cesium.Color.ORANGE,
 * });
 */
