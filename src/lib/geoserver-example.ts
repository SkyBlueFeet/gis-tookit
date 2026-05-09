import * as Cesium from "cesium";
import { GeoServerClient } from "./geoserver";

export function exampleUsage2(viewer: Cesium.Viewer) {
  // 创建不使用缓存的客户端
  const geoserverNoCache = new GeoServerClient({
    baseUrl: "/geoserver",
    workspace: "myWorkspace",
    useCache: false, // 不使用缓存，直接访问WMS服务
  });

  const wmsProvincesProvider = geoserverNoCache.createWMSProvider({
    layers: "state_州行政区划",
  });

  const wmsWorldCountryProvider = geoserverNoCache.createWMSProvider({
    layers: "国家",
  });

  viewer.imageryLayers.addImageryProvider(wmsProvincesProvider);
  viewer.imageryLayers.addImageryProvider(wmsWorldCountryProvider);

  viewer.scene.postProcessStages.fxaa.enabled = true; // 启用FXAA抗锯齿
}
/**
 * GeoServerClient使用示例
 */
export function exampleUsage(viewer: Cesium.Viewer) {
  // 创建GeoServer客户端实例（使用缓存，默认为true）
  const geoserver = new GeoServerClient({
    baseUrl: "/geoserver",
    username: "admin",
    password: "geoserver",
    workspace: "myWorkspace",
    useCache: true, // 使用GeoWebCache缓存
  });

  // 创建不使用缓存的客户端
  const geoserverNoCache = new GeoServerClient({
    baseUrl: "/geoserver",
    workspace: "myWorkspace",
    useCache: false, // 不使用缓存，直接访问WMS服务
  });

  // 创建WMS Provider（使用缓存）
  const wmsProvider = geoserver.createWMSProvider({
    layers: "hotosm_twn_railways_lines_shp",
  });
  // 手动添加到viewer并设置图层属性
  const wmsLayer = viewer.imageryLayers.addImageryProvider(wmsProvider);
  wmsLayer.alpha = 0.8;
  wmsLayer.show = true;

  // 创建WMS Provider（不使用缓存）
  const wmsProviderNoCache = geoserverNoCache.createWMSProvider({
    layers: "hotosm_twn_roads_lines_shp",
  });

  // 创建WMTS Provider
  // 解决 "Unknown TILEMATRIX" 错误：限制瓦片级别范围
  const wmtsProvider = geoserver.createWMTSProvider({
    layer: "hotosm_twn_waterways_lines_shp",
    style: "",
    tileMatrixSetID: "EPSG:4326",
    format: "image/png",
    minimumLevel: 0,
    maximumLevel: 18, // 限制最大级别，避免请求不存在的TILEMATRIX
  });
  // 手动添加到viewer并设置图层属性
  const wmtsLayer = viewer.imageryLayers.addImageryProvider(wmtsProvider);
  wmtsLayer.alpha = 0.9;
  wmtsLayer.brightness = 1.2;

  // 创建TMS Provider
  const tmsProvider = geoserver.createTMSProvider({
    path: "myWorkspace:hotosm_twn_buildings_polygons_shp@EPSG:900913@png",
    fileExtension: "png",
    minimumLevel: 0,
    maximumLevel: 18,
  });
  // 手动添加到viewer
  const tmsLayer = viewer.imageryLayers.addImageryProvider(tmsProvider);

  // 更新配置（可以动态切换是否使用缓存）
  geoserver.updateConfig({
    useCache: false, // 切换为不使用缓存
  });

  // 获取当前配置
  const config = geoserver.getConfig();
  console.log("Current config:", config);

  return { wmsLayer, wmtsLayer, tmsLayer, wmsProviderNoCache };
}
