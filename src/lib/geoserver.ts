import * as Cesium from "cesium";

/**
 * WMS Provider配置选项
 */
export interface WMSProviderOptions {
  url: string;
  layers: string;
  parameters?: Cesium.WebMapServiceImageryProvider.ConstructorOptions["parameters"];
  rectangle?: Cesium.Rectangle;
}

/**
 * WMTS Provider配置选项
 */
export interface WMTSProviderOptions {
  url: string;
  layer: string;
  style: string;
  tileMatrixSetID: string;
  format?: string;
  rectangle?: Cesium.Rectangle;
  minimumLevel?: number;
  maximumLevel?: number;
  tileMatrixLabels?: string[];
  tilingScheme?: Cesium.TilingScheme;
}

/**
 * TMS Provider配置选项
 */
export interface TMSProviderOptions {
  url: string;
  fileExtension?: string;
  rectangle?: Cesium.Rectangle;
  minimumLevel?: number;
  maximumLevel?: number;
}

/**
 * 创建GeoServer WMS Provider
 * @param options WMS配置选项
 * @returns WebMapServiceImageryProvider实例
 */
export function createWMSProvider(
  options: WMSProviderOptions,
): Cesium.WebMapServiceImageryProvider {
  return new Cesium.WebMapServiceImageryProvider({
    url: options.url,
    layers: options.layers,
    parameters: options.parameters || {
      transparent: true,
      format: "image/png",
    },
    rectangle: options.rectangle,
  });
}

/**
 * 创建GeoServer WMTS Provider
 * @param options WMTS配置选项
 * @returns WebMapTileServiceImageryProvider实例
 */
export function createWMTSProvider(
  options: WMTSProviderOptions,
): Cesium.WebMapTileServiceImageryProvider {
  // 自动选择正确的tilingScheme
  let tilingScheme = options.tilingScheme;
  if (!tilingScheme) {
    // 根据TileMatrixSetID自动选择投影方案
    const matrixSetId = options.tileMatrixSetID.toUpperCase();
    if (
      matrixSetId.includes("900913") ||
      matrixSetId.includes("3857") ||
      matrixSetId.includes("WEBMERCATOR")
    ) {
      // Web Mercator投影
      tilingScheme = new Cesium.WebMercatorTilingScheme();
    } else if (matrixSetId.includes("4326") || matrixSetId.includes("CRS84")) {
      // 地理坐标系
      tilingScheme = new Cesium.GeographicTilingScheme();
    }
  }

  return new Cesium.WebMapTileServiceImageryProvider({
    url: options.url,
    layer: options.layer,
    style: options.style,
    tileMatrixSetID: options.tileMatrixSetID,
    format: options.format || "image/png",
    rectangle: options.rectangle,
    minimumLevel: options.minimumLevel,
    maximumLevel: options.maximumLevel,
    tileMatrixLabels: options.tileMatrixLabels,
    tilingScheme: tilingScheme,
  });
}

/**
 * 创建GeoServer TMS Provider
 * @param options TMS配置选项
 * @returns TileMapServiceImageryProvider实例
 */
export function createTMSProvider(
  options: TMSProviderOptions,
): Cesium.TileMapServiceImageryProvider {
  return new Cesium.TileMapServiceImageryProvider({
    url: options.url,
    fileExtension: options.fileExtension || "png",
    rectangle: options.rectangle,
    minimumLevel: options.minimumLevel,
    maximumLevel: options.maximumLevel,
  });
}

/**
 * GeoServer配置选项
 */
export interface GeoServerConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  workspace?: string;
  useCache?: boolean; // 是否使用GeoWebCache缓存，默认true
}

/**
 * 简化的WMS Provider选项（不需要url）
 */
export interface SimpleWMSProviderOptions {
  layers: string;
  workspace?: string;
  parameters?: Cesium.WebMapServiceImageryProvider.ConstructorOptions["parameters"];
  rectangle?: Cesium.Rectangle;
}

/**
 * 简化的WMTS Provider选项（不需要url）
 */
export interface SimpleWMTSProviderOptions {
  layer: string;
  workspace?: string;
  style: string;
  tileMatrixSetID: string;
  format?: string;
  rectangle?: Cesium.Rectangle;
  minimumLevel?: number;
  maximumLevel?: number;
  tileMatrixLabels?: string[];
  tilingScheme?: Cesium.TilingScheme;
}

/**
 * 简化的TMS Provider选项（不需要url）
 */
export interface SimpleTMSProviderOptions {
  path: string;
  fileExtension?: string;
  rectangle?: Cesium.Rectangle;
  minimumLevel?: number;
  maximumLevel?: number;
}

/**
 * GeoServer客户端类
 * 统一管理GeoServer配置并创建图层Provider
 */
export class GeoServerClient {
  private config: GeoServerConfig;

  constructor(config: GeoServerConfig) {
    this.config = config;
  }

  /**
   * 构建WMS服务URL
   */
  private buildWMSUrl(): string {
    const useCache = this.config.useCache !== false; // 默认使用缓存
    return useCache
      ? `${this.config.baseUrl}/gwc/service/wms`
      : `${this.config.baseUrl}/wms`;
  }

  /**
   * 构建WMTS服务URL
   */
  private buildWMTSUrl(): string {
    /**
     * 根据useCache配置选择使用GeoWebCache的WMTS服务URL还是直接访问GeoServer的WMTS服务URL
      - 使用缓存时，URL为 `${baseUrl}/gwc/service/wmts`
      - 不使用缓存时，URL为 `${baseUrl}/wmts`
     这样可以灵活地切换是否使用GeoWebCache缓存服务，同时保持接口的一致性。
     */
    const useCache = this.config.useCache !== false; // 默认使用缓存
    return useCache
      ? `${this.config.baseUrl}/gwc/service/wmts`
      : `${this.config.baseUrl}/wmts`;
  }

  /**
   * 构建TMS服务URL
   */
  private buildTMSUrl(path: string): string {
    const useCache = this.config.useCache !== false; // 默认使用缓存
    return useCache
      ? `${this.config.baseUrl}/gwc/service/tms/1.0.0/${path}`
      : `${this.config.baseUrl}/tms/1.0.0/${path}`;
  }

  /**
   * 获取认证参数
   */
  private getAuthParameters(): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.config.username && this.config.password) {
      const auth = btoa(`${this.config.username}:${this.config.password}`);
      params["Authorization"] = `Basic ${auth}`;
    }
    return params;
  }

  /**
   * 创建WMS Provider
   */
  createWMSProvider(
    options: SimpleWMSProviderOptions,
  ): Cesium.WebMapServiceImageryProvider {
    const workspace = options.workspace || this.config.workspace;
    const layers = workspace
      ? `${workspace}:${options.layers}`
      : options.layers;

    const parameters = {
      ...options.parameters,
      transparent: true,
      format: "image/png",
    };

    return createWMSProvider({
      url: this.buildWMSUrl(),
      layers,
      parameters,
      rectangle: options.rectangle,
    });
  }

  /**
   * 创建WMTS Provider
   */
  createWMTSProvider(
    options: SimpleWMTSProviderOptions,
  ): Cesium.WebMapTileServiceImageryProvider {
    const workspace = options.workspace || this.config.workspace;
    const layer = workspace ? `${workspace}:${options.layer}` : options.layer;

    return createWMTSProvider({
      url: this.buildWMTSUrl(),
      layer,
      style: options.style,
      tileMatrixSetID: options.tileMatrixSetID,
      format: options.format,
      rectangle: options.rectangle,
      minimumLevel: options.minimumLevel,
      maximumLevel: options.maximumLevel,
      tileMatrixLabels: options.tileMatrixLabels,
      tilingScheme: options.tilingScheme,
    });
  }

  /**
   * 创建TMS Provider
   */
  createTMSProvider(
    options: SimpleTMSProviderOptions,
  ): Cesium.TileMapServiceImageryProvider {
    return createTMSProvider({
      url: this.buildTMSUrl(options.path),
      fileExtension: options.fileExtension,
      rectangle: options.rectangle,
      minimumLevel: options.minimumLevel,
      maximumLevel: options.maximumLevel,
    });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<GeoServerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<GeoServerConfig> {
    return { ...this.config };
  }
}
