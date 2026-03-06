import * as CesiumLib from 'cesium';

/**
 * 雷达核心计算模块 - 可复用版本
 * 去除了外部依赖，可以在其他项目中使用
 */

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface RadarGeometry {
  indices: number[];
  positions: number[];
  normals: number[];
  size: number;
}

interface RadarConfig {
  /** 雷达切割份数，数字越大图形越密 */
  th?: number;
  /** 半径（千米） */
  radius?: number;
}

/**
 * 雷达原始轮廓数据
 * 格式: [角度(度), 距离(相对单位)]
 */
const RADAR_ORIGIN_POSITIONS: [number, number][] = [
  [0, 215],
  [0.3, 230],
  [0.4, 240],
  [0.5, 250],
  [0.7, 256],
  [0.8, 263],
  [1, 270],
  [1.3, 276],
  [1.5, 281],
  [1.6, 286],
  [1.7, 290],
  [1.8, 292],
  [1.95, 294],
  [2.1, 296],
  [2.3, 298],
  [2.5, 300],
  [2.7, 303],
  [2.9, 305],
  [3.2, 311],
  [3.5, 314],
  [3.7, 320],
  [3.8, 326],
  [4, 330],
  [4.5, 337],
  [4.9, 346],
  [5.3, 342],
  [5.9, 335],
  [6.4, 331],
  [6.8, 325],
  [7.3, 319],
  [7.6, 313],
  [8.1, 309],
  [8.6, 302],
  [9.1, 294],
  [9.5, 285],
  [10, 279],
  [10.6, 273],
  [11.3, 262],
  [12.7, 257],
  [13.4, 249],
  [14.0, 236],
  [15.2, 221],
  [15.8, 214],
  [16.1, 201],
  [16.6, 192],
  [17.2, 182],
  [18, 175],
  [18.3, 169],
  [18.7, 158],
  [19, 148],
  [20, 142],
  [21.2, 129],
  [23, 123],
  [25, 118],
  [25.5, 110],
  [26, 106],
  [26.5, 101],
  [27, 96],
  [27.6, 91],
  [28.1, 85],
  [28.8, 79],
  [29.4, 71],
  [30, 65],
  [31, 54],
  [32.6, 51],
  [33.9, 46],
  [34.9, 40],
  [36.1, 31],
  [38.2, 26],
  [41, 22],
  [43.2, 18],
  [45, 16],
  [46, 17.2],
  [48.2, 14.6],
  [50.3, 9.7],
  [53.2, 4],
];

/**
 * 创建 Vector3 对象
 */
function createVector3(x: number = 0, y: number = 0, z: number = 0): Vector3 {
  return { x, y, z };
}

/**
 * Vector3 克隆
 */
function cloneVector3(v: Vector3): Vector3 {
  return { x: v.x, y: v.y, z: v.z };
}

/**
 * Vector3 减法
 */
function subtractVector3(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

/**
 * Vector3 加法
 */
function addVector3(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

/**
 * Vector3 标量除法
 */
function divideVector3(v: Vector3, scalar: number): Vector3 {
  return {
    x: v.x / scalar,
    y: v.y / scalar,
    z: v.z / scalar,
  };
}

/**
 * 将 Vector3 数组打包为 number 数组
 */
function packVector3Array(vectors: Vector3[]): number[] {
  const result: number[] = [];
  for (const v of vectors) {
    result.push(v.x, v.y, v.z);
  }
  return result;
}

/**
 * 将 number 数组解包为 Vector3 数组
 */
function unpackVector3Array(numbers: number[]): Vector3[] {
  const result: Vector3[] = [];
  for (let i = 0; i < numbers.length; i += 3) {
    result.push(createVector3(numbers[i], numbers[i + 1], numbers[i + 2]));
  }
  return result;
}

/**
 * 格式化雷达原始轮廓数据为 3D 坐标
 * @param vector 原始轮廓数据 [角度, 距离]
 * @param radius 雷达半径（千米）
 */
function formatRadarOrigins(
  vector: [number, number][],
  radius: number
): Vector3[] {
  return vector.map((point: [number, number]) => {
    const thRadians = (point[0] * Math.PI) / 180; // 角度转弧度
    const len = point[1] * (1 / 346) * 1000 * radius;

    return createVector3(
      len * Math.cos(thRadians),
      0,
      len * Math.sin(thRadians)
    );
  });
}

/**
 * 计算三角形法线并累加到顶点法线数组
 */
function calcNormal(
  i: number,
  j: number,
  k: number,
  positionArray: Vector3[],
  normalArray: Vector3[]
): void {
  try {
    const b = subtractVector3(positionArray[j], positionArray[i]);
    const a = subtractVector3(positionArray[k], positionArray[i]);

    // 叉积计算法线
    const c = createVector3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );

    const len = Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z);
    const normalized = divideVector3(c, len);

    normalArray[i] = addVector3(normalArray[i], normalized);
    normalArray[j] = addVector3(normalArray[j], normalized);
    normalArray[k] = addVector3(normalArray[k], normalized);
  } catch (error) {
    console.error('计算法线错误:', error);
  }
}

/**
 * 计算雷达几何体
 * @param th 雷达切割份数（圆周分段数）
 * @param vcFirstPoint 雷达轮廓点数组
 * @returns 雷达几何体数据
 */
function calculateRadarGeometry(
  th: number,
  vcFirstPoint: Vector3[]
): RadarGeometry {
  let size = 0;
  const positions: Vector3[] = [];
  const indices: number[] = [];
  const vcPointFaxian: Vector3[] = [];

  // 添加中心点
  positions.push(createVector3());
  vcPointFaxian.push(createVector3());
  size++;

  // 遍历轮廓点
  for (let i = 0; i < vcFirstPoint.length; i++) {
    const nowPoint = vcFirstPoint[i];
    positions.push(cloneVector3(nowPoint));
    vcPointFaxian.push(createVector3());
    size++;

    // 旋转生成圆周上的点
    for (let j = 1; j < th; j++) {
      const tmp = (Math.PI * 2.0 * j) / th;

      positions.push(
        createVector3(
          nowPoint.x * Math.cos(tmp) - nowPoint.y * Math.sin(tmp),
          nowPoint.x * Math.sin(tmp) + nowPoint.y * Math.cos(tmp),
          nowPoint.z
        )
      );
      vcPointFaxian.push(createVector3());
      size++;

      if (i === 0) {
        // 底部三角形
        indices.push(0, size - 1, size - 2);
        calcNormal(0, size - 1, size - 2, positions, vcPointFaxian);
      } else {
        // 侧面三角形
        indices.push(size - 1 - th, size - 1, size - 2);
        calcNormal(size - 1 - th, size - 1, size - 2, positions, vcPointFaxian);

        indices.push(size - 1 - th, size - 2, size - 2 - th);
        calcNormal(size - 1 - th, size - 2, size - 2 - th, positions, vcPointFaxian);
      }
    }

    // 闭合圆周
    if (i === 0) {
      indices.push(0, size - th, size - 1);
      calcNormal(0, size - th, size - 1, positions, vcPointFaxian);
    } else {
      indices.push(size - th * 2, size - th, size - 1);
      calcNormal(size - th * 2, size - th, size - 1, positions, vcPointFaxian);

      indices.push(size - th * 2, size - 1, size - 1 - th);
      calcNormal(size - th * 2, size - 1, size - 1 - th, positions, vcPointFaxian);
    }
  }

  // 闭合底部
  for (let i = size - th + 1; i < size; i++) {
    indices.push(i, 0, i - 1);
    calcNormal(i, 0, i - 1, positions, vcPointFaxian);
  }

  indices.push(size - th, 0, size - 1);
  calcNormal(size - th, 0, size - 1, positions, vcPointFaxian);

  // 归一化法线
  for (let i = 0; i < size; i++) {
    const c = vcPointFaxian[i];
    const M = Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z);
    vcPointFaxian[i] = divideVector3(vcPointFaxian[i], M);
  }

  return {
    indices,
    size,
    positions: packVector3Array(positions),
    normals: packVector3Array(vcPointFaxian),
  };
}

/**
 * 计算雷达最大宽度
 * @param radius 雷达半径
 */
function calculateRadarWidth(radius: number): number {
  return formatRadarOrigins(RADAR_ORIGIN_POSITIONS, radius)
    .map((cart) => cart.x)
    .sort((a, b) => a - b)
    .pop() || 0;
}

/**
 * 创建雷达几何体（便捷方法）
 * @param config 雷达配置
 */
function createRadarGeometry(config: RadarConfig = {}): RadarGeometry {
  const th = config.th || 60;
  const radius = config.radius || 300;

  const origins = formatRadarOrigins(RADAR_ORIGIN_POSITIONS, radius);
  return calculateRadarGeometry(th, origins);
}

/**
 * 导出默认配置
 */
const DEFAULT_RADAR_CONFIG: Required<RadarConfig> = {
  th: 60,
  radius: 300,
};

// ============================================================================
// Cesium 集成部分（需要 Cesium 库）
// ============================================================================

/**
 * RadarPrimitive 配置选项
 */
export interface RadarPrimitiveOptions {
  /** 唯一标识 */
  id?: string;
  /** 名称 */
  name?: string;
  /** 位置（Cesium.Cartesian3） */
  position: CesiumLib.Cartesian3;
  /** 雷达切割份数 */
  th?: number;
  /** 半径（千米） */
  radius?: number;
  /** 是否显示 */
  show?: boolean;
  /** 是否显示边框 */
  border?: boolean;
  /** 边框颜色（Cesium.Color） */
  borderColor?: CesiumLib.Color;
  /** 是否显示包络 */
  envelope?: boolean;
  /** 包络颜色（Cesium.Color） */
  envelopeColor?: CesiumLib.Color;
  /** 扫描扇颜色（Cesium.Color） */
  scannerColor?: CesiumLib.Color;
  /** 扫描速度 */
  speed?: number;
  /**
   * 旋转模式（默认 true）
   * - true: 跟随 Cesium 时间旋转，时间停止则扇叶不动，时间越快转动越快
   * - false: 恒定速度自动旋转，不受 Cesium 时间控制
   */
  autoRotate?: boolean;
  /**
   * 自定义雷达轮廓数据
   * 格式: [[角度(度), 距离(相对单位)], ...]
   * 如果不提供，使用默认轮廓
   */
  profileData?: [number, number][];
}

/**
 * 雷达图元类（需要 Cesium 库）
 * 使用示例：
 * ```typescript
  import * as Cesium from 'cesium';
  import { RadarPrimitive } from './radar-core';

  const radar = new RadarPrimitive({
    position: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000),
    radius: 20,
    th: 120,
    borderColor: Cesium.Color.fromCssColorString('#00D9FF'),
    envelopeColor: Cesium.Color.fromCssColorString('#00D9FF').withAlpha(0.4),
    scannerColor: Cesium.Color.fromCssColorString('#00D9FF').withAlpha(0.2),
    autoRotate: false
  }, Cesium);

  viewer.scene.primitives.add(radar);

 * ```
 */
export class RadarPrimitive {
  private _id: string;
  private _name: string;
  private _show: boolean;
  private _th: number;
  private _position: any;
  private _radius: number;
  private _border: boolean;
  private _envelope: boolean;
  private _borderColor: any;
  private _envelopeColor: any;
  private _scannerColor: any;
  private _speed: number;
  private _autoRotate: boolean;
  private _ready: boolean = false;
  private _modified: boolean = false;
  private _modelMatrix: any;
  private _geometryData?: RadarGeometry;
  private _origins: Vector3[]= [];
  private _profileData: [number, number][]; // 雷达轮廓数据

  private _borderPrimitive: any;
  private _envelopePrimitive: any;
  private _scannerPrimitive: any;
  private _lastSecond: any;
  private _constantRotationAngle: number = 0; // 恒定速度旋转的累积角度

  // Cesium 引用（需要外部传入）
  private _Cesium: typeof CesiumLib;

  // 对象池 - 避免每帧创建新对象
  private _scratchMatrix3: any;
  private _scratchMatrix4: any;
  private _scratchRotationMatrix: any;

  constructor(options: RadarPrimitiveOptions, Cesium?: any) {
    // 如果没有传入 Cesium，尝试从全局获取
    this._Cesium = Cesium || (typeof window !== 'undefined' ? (window as any).Cesium : null);

    if (!this._Cesium) {
      throw new Error('Cesium 库未找到，请传入 Cesium 对象或确保全局可访问');
    }

    const defaultValue = this._Cesium.defaultValue;
    const createGuid = this._Cesium.createGuid;

    this._id = defaultValue(options.id, createGuid());
    this._name = defaultValue(options.name, this._id);
    this._th = defaultValue(options.th, 60);
    this._radius = defaultValue(options.radius, 300);
    this._show = defaultValue(options.show, true);
    this._border = defaultValue(options.border, true);
    this._envelope = defaultValue(options.envelope, true);
    this._speed = defaultValue(options.speed, 1);
    this._autoRotate = defaultValue(options.autoRotate, true);
    this._profileData = options.profileData || RADAR_ORIGIN_POSITIONS;

    if (!options.position) {
      throw new Error('必须提供 position 属性');
    }

    this._position = options.position;
    this._borderColor = defaultValue(options.borderColor, this._Cesium.Color.GOLD);
    this._envelopeColor = defaultValue(
      options.envelopeColor,
      this._Cesium.Color.GOLD.withAlpha(0.5)
    );
    this._scannerColor = defaultValue(options.scannerColor, this._Cesium.Color.GOLD);

    this._modelMatrix = this._Cesium.Transforms.eastNorthUpToFixedFrame(this._position);

    // 初始化对象池
    this._scratchMatrix3 = new this._Cesium.Matrix3();
    this._scratchMatrix4 = new this._Cesium.Matrix4();
    this._scratchRotationMatrix = new this._Cesium.Matrix4();

    // 初始化几何体
    this._initGeometry();
  }

  private _initGeometry(): void {
    this._origins = formatRadarOrigins(this._profileData, this._radius);
    this._geometryData = calculateRadarGeometry(this._th, this._origins);
  }

  private _createGeometry(primitiveType: any): any {
    if(!this._geometryData){
      throw new Error('几何体数据未初始化');
    }
    const positions = new Float32Array(this._geometryData.positions);
    const indices = new Uint16Array(this._geometryData.indices);
    const normals = new Float32Array(this._geometryData.normals);

    return new this._Cesium.Geometry({
      // @ts-ignore
      attributes: {
        position: new this._Cesium.GeometryAttribute({
          componentDatatype: this._Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: positions,
        }),
        normal: new this._Cesium.GeometryAttribute({
          componentDatatype: this._Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: normals,
        }),
      },
      indices: indices,
      primitiveType: primitiveType,
      // @ts-ignore
      boundingSphere: this._Cesium.BoundingSphere.fromVertices(positions),
    });
  }

  private _createPrimitive(flag: boolean, color: any, type: any): any {
    if (!flag) return undefined;

    const geometry = this._createGeometry(type);

    return new this._Cesium.Primitive({
      geometryInstances: new this._Cesium.GeometryInstance({
        id: this._id,
        geometry: geometry,
        modelMatrix: this._modelMatrix,
        attributes: {
          color: this._Cesium.ColorGeometryInstanceAttribute.fromColor(color),
        },
      }),
      appearance: new this._Cesium.MaterialAppearance({
        translucent: true,
        material: this._Cesium.Material.fromType('Color', { color }),
      }),
      allowPicking: false,
      asynchronous: false,
    });
  }

  private _createScanner(): any {
    // 将 Vector3 转换为 Cesium.Cartesian3
    const cesiumOrigins = this._origins.map(
      (v) => new this._Cesium.Cartesian3(v.x, v.y, v.z)
    );

    const polygon = this._Cesium.CoplanarPolygonGeometry.createGeometry(
      new this._Cesium.CoplanarPolygonGeometry({
        polygonHierarchy: new this._Cesium.PolygonHierarchy(cesiumOrigins),
        vertexFormat: this._Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
      })
    );

    if (!polygon) {
      throw new Error('无法创建扫描器几何体');
    }

    return new this._Cesium.Primitive({
      geometryInstances: new this._Cesium.GeometryInstance({
        geometry: polygon,
        attributes: {
          color: this._Cesium.ColorGeometryInstanceAttribute.fromColor(
            this._scannerColor
          ),
        },
      }),
      appearance: new this._Cesium.PerInstanceColorAppearance({
        translucent: true,
        flat: true,
      }),
      asynchronous: false,
      modelMatrix: this._modelMatrix,
      allowPicking: false,
    });
  }

  private _initPrimitive(): void {
    this._borderPrimitive = this._createPrimitive(
      this._border,
      this._borderColor,
      this._Cesium.PrimitiveType.LINE_STRIP
    );

    this._envelopePrimitive = this._createPrimitive(
      this._envelope,
      this._envelopeColor,
      this._Cesium.PrimitiveType.TRIANGLES
    );

    this._scannerPrimitive = this._createScanner();
  }

  private _destroyPrimitive(): void {
    if (this._borderPrimitive) {
      this._borderPrimitive.destroy();
      this._borderPrimitive = undefined;
    }
    if (this._envelopePrimitive) {
      this._envelopePrimitive.destroy();
      this._envelopePrimitive = undefined;
    }
    if (this._scannerPrimitive) {
      this._scannerPrimitive.destroy();
      this._scannerPrimitive = undefined;
    }
  }

  /**
   * 更新方法（由 Cesium 场景调用）
   */
  update(frameState: any): void {
    if (!this._show) return;

    if (!this._ready) {
      this._initPrimitive();
      this._ready = true;
    }

    if (this._modified) {
      this._destroyPrimitive();
      this._initGeometry();
      this._initPrimitive();
      this._modified = false;
    }

    const context = frameState;
    const current = context.time;

    if (!this._lastSecond) {
      this._lastSecond = new this._Cesium.JulianDate();
      this._Cesium.JulianDate.clone(current, this._lastSecond);
    }

    if (this._border && this._borderPrimitive) {
      this._borderPrimitive.update(context);
    }

    if (this._scannerPrimitive) {
      let angle: number;

      if (this._autoRotate) {
        // 模式1: 跟随 Cesium 时间旋转（时间停止则不动）
        const timeDiff = this._Cesium.JulianDate.secondsDifference(
          current,
          this._lastSecond
        );
        angle = timeDiff * 80 * this._speed * (Math.PI / 180);
      } else {
        // 模式2: 恒定速度旋转（不受 Cesium 时间影响）
        const frameTime = 1 / 120; // 假设 120fps
        angle = frameTime * 80 * this._speed * (Math.PI / 180);
        this._constantRotationAngle += angle;
      }

      // 使用对象池，避免每帧创建新对象
      const rotation = this._Cesium.Matrix3.fromRotationZ(angle, this._scratchMatrix3);
      const rotationMatrix = this._Cesium.Matrix4.fromRotationTranslation(
        rotation,
        undefined,
        this._scratchRotationMatrix
      );

      // 累积旋转，复用 scratch 对象
      this._scannerPrimitive.modelMatrix = this._Cesium.Matrix4.multiply(
        this._scannerPrimitive.modelMatrix,
        rotationMatrix,
        this._scratchMatrix4
      );

      this._scannerPrimitive.update(context);

      // 更新时间记录
      this._Cesium.JulianDate.clone(current, this._lastSecond);
    }

    if (this._envelope && this._envelopePrimitive) {
      this._envelopePrimitive.update(context);
    }
  }

  /**
   * 销毁方法
   */
  destroy(): void {
    this._destroyPrimitive();
    return this._Cesium.destroyObject(this);
  }

  /**
   * 是否已销毁
   */
  isDestroyed(): boolean {
    return false;
  }

  // Getters and Setters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get show(): boolean {
    return this._show;
  }

  set show(value: boolean) {
    this._show = value;
  }

  get position(): any {
    return this._position;
  }

  set position(value: any) {
    this._position = value;
    this._modelMatrix = this._Cesium.Transforms.eastNorthUpToFixedFrame(value);
    this._modified = true;
  }

  get radius(): number {
    return this._radius;
  }

  set radius(value: number) {
    this._radius = value;
    this._modified = true;
  }

  get th(): number {
    return this._th;
  }

  set th(value: number) {
    this._th = value;
    this._modified = true;
  }

  get border(): boolean {
    return this._border;
  }

  set border(value: boolean) {
    this._border = value;
    this._modified = true;
  }

  get borderColor(): any {
    return this._borderColor;
  }

  set borderColor(value: any) {
    this._borderColor = value;
    this._modified = true;
  }

  get envelope(): boolean {
    return this._envelope;
  }

  set envelope(value: boolean) {
    this._envelope = value;
    this._modified = true;
  }

  get envelopeColor(): any {
    return this._envelopeColor;
  }

  set envelopeColor(value: any) {
    this._envelopeColor = value;
    this._modified = true;
  }

  get scannerColor(): any {
    return this._scannerColor;
  }

  set scannerColor(value: any) {
    this._scannerColor = value;
    this._modified = true;
  }

  get speed(): number {
    return this._speed;
  }

  set speed(value: number) {
    this._speed = value;
  }

  get autoRotate(): boolean {
    return this._autoRotate;
  }

  set autoRotate(value: boolean) {
    this._autoRotate = value;
  }

  get ready(): boolean {
    return this._ready;
  }

  get modelMatrix(): any {
    return this._modelMatrix;
  }
}
