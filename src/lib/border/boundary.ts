import * as Cesium from 'cesium';

/**
 * GeoJSON Feature 类型定义
 */
interface GeoJSONFeature {
  type: string;
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

/**
 * GeoJSON FeatureCollection 类型定义
 */
interface GeoJSONFeatureCollection {
  type: string;
  name?: string;
  features: GeoJSONFeature[];
}

/**
 * 边界渲染器配置选项
 */
export interface BoundaryRendererOptions {
  /** 边界线颜色（十六进制或 Cesium.Color） */
  color?: Cesium.Color | string;
  /** 边界线宽度 */
  width?: number;
  /** 是否填充多边形 */
  fill?: boolean;
  /** 填充颜色（十六进制或 Cesium.Color） */
  fillColor?: Cesium.Color | string;
  /** 填充透明度 */
  fillOpacity?: number;
  /** 高度（应用于所有坐标） */
  height?: number;
  /** 是否启用贴地功能（线条贴地表，忽略 height 值） */
  clampToGround?: boolean;
  /** 贴地线条是否显示轮廓 */
  groundLineOutline?: boolean;
  /** 贴地线条轮廓颜色 */
  groundLineOutlineColor?: Cesium.Color | string;
  /** 异步加载时每批处理的 Feature 数量 */
  batchSize?: number;
  /** 是否使用异步加载模式 */
  async?: boolean;
  /** 是否启用坐标简化（Douglas-Peucker 算法）降低顶点数量 */
  simplifyCoordinates?: boolean;
  /** 坐标简化的容差度（单位：度） */
  simplifyTolerance?: number;
  /** 是否合并多个 Primitive 为单个批次（提升渲染性能） */
  batchPrimitives?: boolean;
  /** 是否启用材质缓存 */
  cacheMaterial?: boolean;
}

/**
 * 异步加载进度回调
 */
export type LoadProgressCallback = (progress: {
  loaded: number;
  total: number;
  percentage: number;
}) => void;

/**
 * Cesium 边界数据渲染器
 * 使用 PrimitiveApi 渲染 GeoJSON 多边形边界数据
 */
export class BoundaryRenderer {
  private primitives: Cesium.PrimitiveCollection;
  private options: Required<BoundaryRendererOptions>;
  private drawnPrimitives: Cesium.Primitive[] = [];
  private cancelToken: boolean = false;
  private progressCallback?: LoadProgressCallback;
  private materialCache: Map<string, Cesium.Material> = new Map();
  private geometryInstancesBatch: Cesium.GeometryInstance[] = [];
  private appearanceCache: Map<string, Cesium.Appearance> = new Map();

  constructor(scene: Cesium.Scene, options: BoundaryRendererOptions = {}) {
    this.primitives = scene.primitives;

    // 设置默认选项
    this.options = {
      color: Cesium.Color.WHITE,
      width: 2,
      fill: true,
      fillColor: Cesium.Color.BLUE,
      fillOpacity: 0.3,
      height: 0,
      clampToGround: false,
      groundLineOutline: false,
      groundLineOutlineColor: Cesium.Color.BLACK,
      batchSize: 100, // 每批处理 100 个 feature
      async: true, // 默认使用异步模式
      simplifyCoordinates: true, // 启用坐标简化
      simplifyTolerance: 0.0001, // 简化容差 0.0001 度～11米
      batchPrimitives: true, // 启用 Primitive 批处理
      cacheMaterial: true, // 启用材质缓存
      ...options,
    };

    // 处理字符串颜色
    if (typeof this.options.color === 'string') {
      this.options.color = Cesium.Color.fromCssColorString(
        this.options.color,
      );
    }
    if (typeof this.options.fillColor === 'string') {
      this.options.fillColor = Cesium.Color.fromCssColorString(
        this.options.fillColor,
      );
    }
    if (typeof this.options.groundLineOutlineColor === 'string') {
      this.options.groundLineOutlineColor = Cesium.Color.fromCssColorString(
        this.options.groundLineOutlineColor,
      );
    }
  }

  /**
   * 从 GeoJSON 加载边界数据
   * @param geojsonData GeoJSON FeatureCollection 或 Feature 对象
   */
  public loadGeoJSON(geojsonData: GeoJSONFeatureCollection | any): void {
    this.clear();

    if (!geojsonData.features) {
      console.error('Invalid GeoJSON format');
      return;
    }

    for (const feature of geojsonData.features) {
      this.drawFeature(feature);
    }

    // 刷新剩余的批处理几何体
    if (this.options.batchPrimitives && this.geometryInstancesBatch.length > 0) {
      const appearance = this.getAppearanceForType('line');
      this.createBatchedPrimitive(
        this.geometryInstancesBatch,
        appearance,
      );
      this.geometryInstancesBatch = [];
    }

    console.log(`✓ GeoJSON 加载完成，共加载 ${geojsonData.features.length} 个 Features，${this.drawnPrimitives.length} 个 Primitives`);
  }

  /**
   * 异步加载 GeoJSON 数据（分批处理，避免浏览器卡顿）
   * @param geojsonData GeoJSON FeatureCollection 或 Feature 对象
   * @param onProgress 进度回调函数
   * @returns Promise 
   */
  public async loadGeoJSONAsync(
    geojsonData: GeoJSONFeatureCollection | any,
    onProgress?: LoadProgressCallback,
  ): Promise<void> {
    this.clear();
    this.cancelToken = false;
    this.progressCallback = onProgress;

    if (!geojsonData.features) {
      console.error('Invalid GeoJSON format');
      return;
    }

    const features = geojsonData.features;
    const total = features.length;
    const batchSize = this.options.batchSize;

    // 分批处理 features
    for (let i = 0; i < total; i += batchSize) {
      // 检查是否被取消
      if (this.cancelToken) {
        console.warn('GeoJSON 加载被取消');
        break;
      }

      const batch = features.slice(i, Math.min(i + batchSize, total));

      // 处理当前批次
      for (const feature of batch) {
        this.drawFeature(feature);
      }

      // 报告进度
      const loaded = Math.min(i + batchSize, total);
      const percentage = Math.round((loaded / total) * 100);
      this.progressCallback?.({
        loaded,
        total,
        percentage,
      });

      // 让出主线程，使用 requestIdleCallback 或 setTimeout
      await this.delay(0);
    }

    // 刷新剩余的批处理几何体
    if (this.options.batchPrimitives && this.geometryInstancesBatch.length > 0) {
      const appearance = this.getAppearanceForType('line');
      this.createBatchedPrimitive(
        this.geometryInstancesBatch,
        appearance,
      );
      this.geometryInstancesBatch = [];
    }

    console.log(`✓ GeoJSON 加载完成，共加载 ${total} 个 Features`);
  }

  /**
   * 从 URL 异步加载并渲染 GeoJSON 文件
   * @param url GeoJSON 文件的 URL
   * @param onProgress 进度回调函数
   */
  public async loadFromURLAsync(
    url: string,
    onProgress?: LoadProgressCallback,
  ): Promise<void> {
    try {
      // 计时开始
      const startTime = performance.now();

      // 报告下载开始
      onProgress?.({ loaded: 0, total: 0, percentage: 0 });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.ok}`);
      }

      // 获取文件总大小
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      // 读取响应体
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Cannot read response body');
      }

      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loaded += value.length;

        // 报告下载进度
        const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
        onProgress?.({ loaded, total, percentage });
      }

      // 合并所有块
      const chunksAll = new Uint8Array(loaded);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      // 解析 JSON
      const text = new TextDecoder().decode(chunksAll);
      const geojsonData = JSON.parse(text);

      // 异步加载 GeoJSON
      await this.loadGeoJSONAsync(geojsonData, onProgress);

      const loadTime = performance.now() - startTime;
      console.log(`✓ 总耗时: ${loadTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('Failed to load GeoJSON from URL:', error);
      throw error;
    }
  }

  /**
   * 绘制单个 GeoJSON Feature
   * @param feature GeoJSON Feature
   */
  private drawFeature(feature: GeoJSONFeature): void {
    const { type, coordinates } = feature.geometry;

    switch (type) {
      case 'Polygon':
        this.drawPolygon(coordinates as number[][][]);
        break;
      case 'MultiPolygon':
        for (const polygon of coordinates as number[][][][]) {
          this.drawPolygon(polygon);
        }
        break;
      case 'LineString':
        this.drawLineString(coordinates as number[][]);
        break;
      case 'MultiLineString':
        for (const line of coordinates as number[][][]) {
          this.drawLineString(line);
        }
        break;
      case 'Point':
        this.drawPoint(coordinates as number[]);
        break;
    }
  }

  /**
   * 绘制多边形及其边界
   * @param rings 多边形环数组 [[lng, lat], ...]
   */
  private drawPolygon(rings: number[][][]): void {
    if (!rings || rings.length === 0) return;

    // 坐标简化优化
    let simplifiedRings = rings;
    if (this.options.simplifyCoordinates) {
      simplifiedRings = rings.map((ring) =>
        this.simplifyCoordinates(ring, this.options.simplifyTolerance),
      );
    }

    // 简化后检查：确保至少有 3 个点来形成有效的多边形
    if (simplifiedRings[0].length < 3) return;

    const positions = this.convertCoordinatesToCartesian(simplifiedRings[0]);

    if (positions.length < 3) return;

    // 绘制填充多边形
    if (this.options.fill) {
      const color = this.options.fillColor as Cesium.Color;
      const fillColor = color.withAlpha(this.options.fillOpacity);

      try {
        const positions = Cesium.Cartesian3.fromDegreesArray(
          simplifiedRings[0].flat() as number[],
        );

        // 贴地模式下不设置高度
        const geometryOptions: any = {
          positions: positions,
          vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL,
        };

        if (!this.options.clampToGround) {
          geometryOptions.height = this.options.height;
        }

        const geometry = Cesium.PolygonGeometry.fromPositions(geometryOptions);

        // 使用缓存的材质
        const material = this.getMaterialForColor(fillColor);
        const appearance = new Cesium.MaterialAppearance({
          material: material,
        });

        const instance = new Cesium.GeometryInstance({
          geometry: geometry,
        });

        const primitive = this.primitives.add(
          new Cesium.Primitive({
            geometryInstances: instance,
            appearance: appearance,
            asynchronous: false,
          }),
        );

        this.drawnPrimitives.push(primitive);
      } catch (error) {
        console.warn('Error drawing filled polygon:', error);
      }
    }

    // 绘制多边形边界线
    this.drawLineString(simplifiedRings[0]);

    // 绘制孔洞（内环）
    for (let i = 1; i < simplifiedRings.length; i++) {
      this.drawLineString(simplifiedRings[i]);
    }
  }

  /**
   * 绘制线条
   * @param coordinates 坐标数组 [[lng, lat], ...]
   */
  private drawLineString(coordinates: number[][]): void {
    if (!coordinates || coordinates.length < 2) return;

    try {
      // 坐标简化优化
      let simplifiedCoordinates = coordinates;
      if (this.options.simplifyCoordinates) {
        simplifiedCoordinates = this.simplifyCoordinates(
          coordinates,
          this.options.simplifyTolerance,
        );
      }

      // 简化后检查：确保至少有 2 个点来形成有效的线条
      if (simplifiedCoordinates.length < 2) return;

      if (this.options.clampToGround) {
        // 贴地线条：使用 GroundPolylineGeometry
        this.drawGroundLineString(simplifiedCoordinates);
      } else {
        // 普通线条：使用 PolylineGeometry
        const positions = this.convertCoordinatesToCartesian(simplifiedCoordinates);

        const geometry = new Cesium.PolylineGeometry({
          positions: positions,
          width: this.options.width,
          vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
          arcType: Cesium.ArcType.GEODESIC,
        });

        const appearance = this.getAppearanceForType('line');

        const instances = new Cesium.GeometryInstance({
          geometry: geometry,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              this.options.color as Cesium.Color,
            ),
          },
        });

        if (this.options.batchPrimitives) {
          // 累积到批处理数组
          this.geometryInstancesBatch.push(instances);
          // 每累积 50 个几何体就批量创建
          if (this.geometryInstancesBatch.length >= 50) {
            this.createBatchedPrimitive(
              this.geometryInstancesBatch,
              appearance,
            );
            this.geometryInstancesBatch = [];
          }
        } else {
          // 直接创建 Primitive
          const primitive = this.primitives.add(
            new Cesium.Primitive({
              geometryInstances: instances,
              appearance: appearance,
              asynchronous: false,
            }),
          );

          this.drawnPrimitives.push(primitive);
        }
      }
    } catch (error) {
      console.warn('Error drawing line string:', error);
    }
  }

  /**
   * 绘制贴地线条
   * @param coordinates 坐标数组 [[lng, lat], ...]
   */
  private drawGroundLineString(coordinates: number[][]): void {
    try {
      const positions = coordinates.map((coord) =>
        Cesium.Cartesian3.fromDegrees(coord[0], coord[1]),
      );

      const geometry = new Cesium.GroundPolylineGeometry({
        positions: positions,
        width: this.options.width,
        arcType: Cesium.ArcType.GEODESIC,
      });

      const instances = new Cesium.GeometryInstance({
        geometry: geometry,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            this.options.color as Cesium.Color,
          ),
        },
      });

      const appearance = new Cesium.PolylineColorAppearance({
        translucent: false,
      });

      const primitive = this.primitives.add(
        new Cesium.GroundPolylinePrimitive({
          geometryInstances: instances,
          appearance: appearance,
          asynchronous: false,
        }),
      );

      this.drawnPrimitives.push(primitive);
    } catch (error) {
      console.warn('Error drawing ground line string:', error);
    }
  }

  /**
   * 绘制点
   * @param coordinate 坐标 [lng, lat]
   */
  private drawPoint(coordinate: number[]): void {
    if (!coordinate || coordinate.length < 2) return;

    const cartesian = Cesium.Cartesian3.fromDegrees(
      coordinate[0],
      coordinate[1],
      this.options.height,
    );

    try {
      const geometry = new Cesium.EllipsoidGeometry({
        radii: new Cesium.Cartesian3(1000, 1000, 1000),
        vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL,
      });

      const appearance = new Cesium.MaterialAppearance({
        material: Cesium.Material.fromType('Color', {
          color: (this.options.fillColor as Cesium.Color).withAlpha(0.8),
        }),
      });

      const instance = new Cesium.GeometryInstance({
        geometry: geometry,
        modelMatrix: Cesium.Matrix4.multiplyByTranslation(
          Cesium.Matrix4.IDENTITY,
          cartesian,
          new Cesium.Matrix4(),
        ),
      });

      const primitive = this.primitives.add(
        new Cesium.Primitive({
          geometryInstances: instance,
          appearance: appearance,
          asynchronous: false,
        }),
      );

      this.drawnPrimitives.push(primitive);
    } catch (error) {
      console.warn('Error drawing point:', error);
    }
  }

  /**
   * 将经纬度坐标转换为 Cartesian3
   * @param coordinates 坐标数组 [[lng, lat], ...]
   * @returns Cartesian3 数组
   */
  private convertCoordinatesToCartesian(
    coordinates: number[][],
  ): Cesium.Cartesian3[] {
    return coordinates.map((coord) =>
      Cesium.Cartesian3.fromDegrees(
        coord[0],
        coord[1],
        this.options.height,
      ),
    );
  }

  /**
   * 更新渲染器选项
   * @param options 新的选项
   */
  public updateOptions(options: Partial<BoundaryRendererOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    } as Required<BoundaryRendererOptions>;

    // 处理字符串颜色
    if (typeof this.options.color === 'string') {
      this.options.color = Cesium.Color.fromCssColorString(
        this.options.color,
      );
    }
    if (typeof this.options.fillColor === 'string') {
      this.options.fillColor = Cesium.Color.fromCssColorString(
        this.options.fillColor,
      );
    }
    if (typeof this.options.groundLineOutlineColor === 'string') {
      this.options.groundLineOutlineColor = Cesium.Color.fromCssColorString(
        this.options.groundLineOutlineColor,
      );
    }
  }

  /**
   * 清除所有绘制的图形
   */
  public clear(): void {
    for (const primitive of this.drawnPrimitives) {
      this.primitives.remove(primitive);
    }
    this.drawnPrimitives = [];
    this.geometryInstancesBatch = [];
  }

  /**
   * 销毁渲染器
   */
  public destroy(): void {
    this.clear();
    // 清理缓存
    this.materialCache.clear();
    this.appearanceCache.clear();
  }

  /**
   * 获取绘制的原始对象数量
   */
  public getPrimitiveCount(): number {
    return this.drawnPrimitives.length;
  }

  /**
   * 取消当前的异步加载操作
   */
  public cancelAsync(): void {
    this.cancelToken = true;
    console.log('已请求取消异步加载');
  }

  /**
   * 内部延迟函数，用于让出主线程
   * @param ms 延迟毫秒数
   */
  private delay(ms: number = 0): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback !== 'undefined') {
        // 优先使用 requestIdleCallback，在浏览器空闲时执行
        requestIdleCallback(() => resolve(), { timeout: 100 });
      } else {
        // 降级到 setTimeout
        setTimeout(resolve, ms);
      }
    });
  }

  /**
   * Douglas-Peucker 坐标简化算法
   * 大幅减少顶点数量，保留关键点
   * @param coordinates 坐标数组 [[lng, lat], ...]
   * @param tolerance 容差度（单位：度）
   * @returns 简化后的坐标数组
   */
  private simplifyCoordinates(
    coordinates: number[][],
    tolerance: number,
  ): number[][] {
    if (coordinates.length <= 2) return coordinates;

    // 检查起点和终点是否相同（闭合环）
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    const isClosed = start[0] === end[0] && start[1] === end[1];

    // 寻找离线段最远的点
    let maxDistance = 0;
    let maxIndex = 0;

    for (let i = 1; i < coordinates.length - 1; i++) {
      const distance = this.perpendicularDistance(
        coordinates[i],
        start,
        end,
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // 如果最大距离大于容差，则递归简化
    if (maxDistance > tolerance) {
      const left = this.simplifyCoordinates(
        coordinates.slice(0, maxIndex + 1),
        tolerance,
      );
      const right = this.simplifyCoordinates(
        coordinates.slice(maxIndex),
        tolerance,
      );

      // 连接两部分，移除重复的端点
      return [...left.slice(0, -1), ...right];
    }

    // 返回简化后的线段，如果是闭合的就保持闭合
    if (isClosed && (start[0] !== end[0] || start[1] !== end[1])) {
      return [start, end, start];
    }
    return [start, end];
  }

  /**
   * 计算点到线段的垂直距离
   * @param point 点坐标
   * @param start 线段起点
   * @param end 线段终点
   * @returns 距离（度数）
   */
  private perpendicularDistance(
    point: number[],
    start: number[],
    end: number[],
  ): number {
    const [px, py] = point;
    const [x1, y1] = start;
    const [x2, y2] = end;

    const num = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1);
    const den = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

    return den === 0 ? 0 : num / den;
  }

  /**
   * 获取或创建缓存的材质
   * @param color Cesium Color 对象
   * @returns Material 对象
   */
  private getMaterialForColor(color: Cesium.Color): Cesium.Material {
    if (!this.options.cacheMaterial) {
      return Cesium.Material.fromType('Color', { color });
    }

    const key = color.toCssColorString();
    if (!this.materialCache.has(key)) {
      this.materialCache.set(
        key,
        Cesium.Material.fromType('Color', { color }),
      );
    }

    return this.materialCache.get(key)!;
  }

  /**
   * 获取或创建缓存的外观
   * @param type 外观类型 'line' 或 'polygon'
   * @param translucent 是否透明
   * @returns Appearance 对象
   */
  private getAppearanceForType(
    type: string,
    translucent: boolean = false,
  ): Cesium.Appearance {
    const key = `${type}-${translucent}`;

    if (!this.options.cacheMaterial) {
      if (type === 'line') {
        return new Cesium.PolylineColorAppearance({ translucent });
      } else {
        return new Cesium.MaterialAppearance({ translucent });
      }
    }

    if (!this.appearanceCache.has(key)) {
      if (type === 'line') {
        this.appearanceCache.set(
          key,
          new Cesium.PolylineColorAppearance({ translucent }),
        );
      } else {
        this.appearanceCache.set(
          key,
          new Cesium.MaterialAppearance({ translucent }),
        );
      }
    }

    return this.appearanceCache.get(key)!;
  }

  /**
   * 批量创建 Primitive（合并多个 GeometryInstance）
   * @param instances GeometryInstance 数组
   * @param appearance Appearance 对象
   */
  private createBatchedPrimitive(
    instances: Cesium.GeometryInstance[],
    appearance: Cesium.Appearance,
  ): void {
    if (instances.length === 0) return;

    try {
      const primitive = this.primitives.add(
        new Cesium.Primitive({
          geometryInstances: instances,
          appearance: appearance,
          asynchronous: false,
        }),
      );

      this.drawnPrimitives.push(primitive);
    } catch (error) {
      console.warn('Error creating batched primitive:', error);
    }
  }
}

/**
 * 便利函数：直接加载并渲染 GeoJSON
 * @param scene Cesium 场景
 * @param geojsonData GeoJSON 数据
 * @param options 渲染选项
 * @returns BoundaryRenderer 实例
 * 
 * @example
 * // 测试用例：加载世界国家边界
 * import { Viewer } from 'cesium';
 * import { renderBoundaries } from '@/lib/border/boundary';
 * 
 * // 1. 创建 Cesium 查看器
 * const viewer = new Viewer('cesiumContainer');
 * 
 * // 2. 准备 GeoJSON 数据（从 fetch 或导入）
 * const geojsonData = await fetch('path/to/World Country.geojson')
 *   .then(response => response.json());
 * 
 * // 3. 使用渲染器渲染边界，自定义渲染样式
 * const renderer = renderBoundaries(viewer.scene, geojsonData, {
 *   color: '#FF6B6B',        // 边界线颜色为红色
 *   width: 2,                // 边界线宽度为 2 像素
 *   fill: true,              // 启用多边形填充
 *   fillColor: '#4ECDC4',    // 填充颜色为青色
 *   fillOpacity: 0.3,        // 填充透明度为 30%
 *   height: 0,               // 高度偏移为 0
 * });
 * 
 * // 4. 可选：更新样式
 * renderer.updateOptions({
 *   color: '#FFD700',        // 改为金色边界
 *   fillColor: '#87CEEB',    // 改为浅蓝色填充
 *   fillOpacity: 0.5,
 * });
 * 
 * // 5. 清除渲染
 * renderer.clear();
 * 
 * // 6. 销毁渲染器
 * renderer.destroy();
 */
export function renderBoundaries(
  scene: Cesium.Scene,
  geojsonData: GeoJSONFeatureCollection,
  options?: BoundaryRendererOptions,
): BoundaryRenderer {
  const renderer = new BoundaryRenderer(scene, options);
  renderer.loadGeoJSON(geojsonData);
  return renderer;
}

/**
 * 便利函数：从 URL 加载并渲染 GeoJSON
 * @param scene Cesium 场景
 * @param url GeoJSON URL
 * @param options 渲染选项
 * @returns Promise<BoundaryRenderer> 渲染器实例的 Promise
 */
export async function renderBoundariesFromURL(
  scene: Cesium.Scene,
  url: string,
  options?: BoundaryRendererOptions,
): Promise<BoundaryRenderer> {
  const renderer = new BoundaryRenderer(scene, options);
  await renderer.loadFromURLAsync(url);
  return renderer;
}

/**
 * 便利函数：异步加载并渲染 GeoJSON（带进度回调）
 * @param scene Cesium 场景
 * @param geojsonData GeoJSON 数据
 * @param onProgress 进度回调函数
 * @param options 渲染选项
 * @returns Promise<BoundaryRenderer> 渲染器实例的 Promise
 */
export async function renderBoundariesAsync(
  scene: Cesium.Scene,
  geojsonData: GeoJSONFeatureCollection,
  onProgress?: LoadProgressCallback,
  options?: BoundaryRendererOptions,
): Promise<BoundaryRenderer> {
  const renderer = new BoundaryRenderer(scene, options);
  await renderer.loadGeoJSONAsync(geojsonData, onProgress);
  return renderer;
}

/**
 * 便利函数：从 URL 异步加载并渲染 GeoJSON（带进度回调）
 * @param scene Cesium 场景
 * @param url GeoJSON URL
 * @param onProgress 进度回调函数
 * @param options 渲染选项
 * @returns Promise<BoundaryRenderer> 渲染器实例的 Promise
 */
export async function renderBoundariesFromURLAsync(
  scene: Cesium.Scene,
  url: string,
  onProgress?: LoadProgressCallback,
  options?: BoundaryRendererOptions,
): Promise<BoundaryRenderer> {
  const renderer = new BoundaryRenderer(scene, options);
  await renderer.loadFromURLAsync(url, onProgress);
  return renderer;
}
