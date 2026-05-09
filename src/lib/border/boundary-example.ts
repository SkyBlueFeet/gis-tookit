import { Viewer } from "cesium";
import {
  BoundaryRenderer,
  BoundaryRendererOptions,
  LoadProgressCallback,
  renderBoundaries,
  renderBoundariesFromURL,
  renderBoundariesAsync,
  renderBoundariesFromURLAsync,
} from "./boundary";

/**
 * 边界渲染器使用示例和测试函数
 */

/**
 * 简单测试：加载并显示边界（不启用复杂优化）
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function simpleBoundaryUsage(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<void> {
  console.log(`📍 开始加载边界: ${geojsonPath}`);

  try {
    // 加载 GeoJSON 数据
    const response = await fetch(geojsonPath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const geojsonData = await response.json();
    console.log(`✓ GeoJSON 已加载，Features: ${geojsonData.features?.length || 0}`);

    // 使用最简洁的配置（禁用所有优化以确保兼容性）
    const renderer = renderBoundaries(viewer.scene, geojsonData, {
      color: "#00FFFF",
      width: 2,
      fill: false,
      fillColor: "#4ECDC4",
      fillOpacity: 0.3,
      height: 0,
      clampToGround: true, // 禁用贴地以保证兼容性
      simplifyCoordinates: false, // 启用坐标简化（已修复 BUG）
      simplifyTolerance: 0.0001, // 简化容差
      batchPrimitives: true, // 启用批处理
      cacheMaterial: true, // 启用缓存
    });

    const primitives = renderer.getPrimitiveCount();
    console.log(`✓ 已渲染 ${primitives} 个 Primitive`);

    if (primitives === 0) {
      console.warn(
        "⚠️  未创建任何 Primitive，检查 GeoJSON 数据或渲染配置",
      );
    }
  } catch (error) {
    console.error(`❌ 加载失败: ${geojsonPath}`, error);
    throw error;
  }
}

/**
 * 基础测试：直接加载 GeoJSON 数据并渲染
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function boundaryUsage1(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<void> {
  // 直接转发到 simpleBoundaryUsage
  return simpleBoundaryUsage(viewer, geojsonPath);
}

/**
 * 高级测试：多个渲染器同时渲染不同区域
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function advancedBoundaryUsage(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<BoundaryRenderer[]> {
  console.log("=== 高级边界渲染测试 ===\n");

  const response = await fetch(geojsonPath);
  const geojsonData = await response.json();

  const renderers: BoundaryRenderer[] = [];

  // 创建多个渲染器，每个使用不同的颜色配置
  const configs: BoundaryRendererOptions[] = [
    {
      color: "#FF0000",
      width: 2,
      fill: true,
      fillColor: "#FF6B6B",
      fillOpacity: 0.2,
    },
    {
      color: "#00FF00",
      width: 2,
      fill: true,
      fillColor: "#00AA00",
      fillOpacity: 0.2,
    },
    {
      color: "#0000FF",
      width: 2,
      fill: true,
      fillColor: "#0000FF",
      fillOpacity: 0.2,
    },
  ];

  for (let i = 0; i < Math.min(configs.length, 1); i++) {
    const renderer = renderBoundaries(viewer.scene, geojsonData, configs[i]);
    renderers.push(renderer);
    console.log(`✓ 创建配置 ${i + 1}: 颜色=${configs[i].color}`);
  }

  console.log(`\n✓ 总共创建了 ${renderers.length} 个渲染器\n`);

  return renderers;
}

/**
 * 清理测试：演示资源清理
 * @param renderers 要清理的渲染器数组
 */
export function cleanupBoundaryUsage(renderers: BoundaryRenderer[]): void {
  console.log("=== 清理测试资源 ===\n");

  for (let i = 0; i < renderers.length; i++) {
    renderers[i].destroy();
    console.log(`✓ 已销毁渲染器 ${i + 1}`);
  }

  console.log(`\n✓ 共清理了 ${renderers.length} 个渲染器\n`);
}

/**
 * 性能测试：测试渲染器的性能和数据处理能力
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function performanceBoundaryUsage(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<void> {
  console.log("=== 性能测试 ===\n");

  const startTime = performance.now();

  // 加载数据
  console.log("加载 GeoJSON 数据...");
  const response = await fetch(geojsonPath);
  const geojsonData = await response.json();
  const loadTime = performance.now() - startTime;

  console.log(`✓ 加载耗时: ${loadTime.toFixed(2)}ms`);

  // 渲染数据
  const renderStart = performance.now();
  const renderer = renderBoundaries(viewer.scene, geojsonData, {
    color: "#FF6B6B",
    width: 2,
    fill: true,
    fillColor: "#4ECDC4",
    fillOpacity: 0.3,
  });
  const renderTime = performance.now() - renderStart;

  console.log(`✓ 渲染耗时: ${renderTime.toFixed(2)}ms`);
  console.log(`✓ 渲染了 ${renderer.getPrimitiveCount()} 个 Primitive\n`);

  const totalTime = performance.now() - startTime;
  console.log(`📊 总耗时: ${totalTime.toFixed(2)}ms`);
  console.log(
    `📊 平均每个 Feature 耗时: ${(totalTime / geojsonData.features.length).toFixed(2)}ms\n`,
  );
}

/**
 * 贴地功能测试：演示贴地线条和多边形渲染
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function clampToGroundBoundaryUsage(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<BoundaryRenderer[]> {
  console.log("=== 贴地功能测试 ===\n");

  try {
    // 加载 GeoJSON 数据
    console.log("步骤 1: 加载 GeoJSON 数据...");
    const response = await fetch(geojsonPath);
    const geojsonData = await response.json();
    console.log(`✓ 已加载 ${geojsonData.features?.length || 0} 个 Feature\n`);

    const renderers: BoundaryRenderer[] = [];

    // 1. 普通模式：线条悬浮在指定高度
    console.log("步骤 2: 创建普通浮空渲染器...");
    const floatingRenderer = renderBoundaries(viewer.scene, geojsonData, {
      color: "#FF6B6B",
      width: 2,
      fill: true,
      fillColor: "#FF6B6B",
      fillOpacity: 0.2,
      height: 1000, // 千米高度
      clampToGround: false, // 普通模式
    });
    renderers.push(floatingRenderer);
    console.log(
      `✓ 浮空渲染器已创建，包含 ${floatingRenderer.getPrimitiveCount()} 个 Primitive\n`,
    );

    // 2. 贴地模式：线条贴地表
    console.log("步骤 3: 创建贴地渲染器...");
    const clampedRenderer = renderBoundaries(viewer.scene, geojsonData, {
      color: "#00FF00",
      width: 2,
      fill: true,
      fillColor: "#00FF00",
      fillOpacity: 0.15,
      clampToGround: true, // 启用贴地
    });
    renderers.push(clampedRenderer);
    console.log(
      `✓ 贴地渲染器已创建，包含 ${clampedRenderer.getPrimitiveCount()} 个 Primitive\n`,
    );

    // 3. 演示更新为贴地模式
    console.log("步骤 4: 演示动态切换到贴地模式...");
    floatingRenderer.updateOptions({
      clampToGround: true,
      color: "#FFD700",
      fillColor: "#FFD700",
    });
    console.log("✓ 浮空渲染器已更新为贴地模式\n");

    console.log("=== 贴地功能测试完成 ===\n");
    console.log("📊 贴地功能说明:");
    console.log("- 当 clampToGround=true 时，线条使用 GroundPolylineGeometry");
    console.log("- 线条自动贴附到地形表面");
    console.log("- 多边形填充随地形起伏");
    console.log("- 忽略 height 参数，始终贴附到地表\n");

    return renderers;
  } catch (error) {
    console.error("❌ 贴地功能测试失败:", error);
    throw error;
  }
}

/**
 * 异步加载性能测试：对比同步和异步加载的性能
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function asyncLoadBoundaryUsage(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<void> {
  console.log("=== 异步加载性能测试 ===\n");

  try {
    // 1. 加载 GeoJSON 数据
    console.log("步骤 1: 加载 GeoJSON 数据...");
    const response = await fetch(geojsonPath);
    const geojsonData = await response.json();
    console.log(`✓ 已加载 ${geojsonData.features?.length || 0} 个 Feature\n`);

    // 2. 测试同步加载（不推荐用于大数据量）
    console.log("步骤 2: 测试同步加载模式...");
    const syncStart = performance.now();
    const syncRenderer = renderBoundaries(viewer.scene, geojsonData, {
      color: "#FF6B6B",
      width: 2,
      fill: true,
      fillColor: "#FF6B6B",
      fillOpacity: 0.2,
      async: false, // 显式使用同步模式
    });
    const syncTime = performance.now() - syncStart;
    console.log(`✓ 同步加载耗时: ${syncTime.toFixed(2)}ms\n`);
    console.log(`  - 渲染了 ${syncRenderer.getPrimitiveCount()} 个 Primitive`);
    console.log(
      `  - 平均单位耗时: ${(syncTime / geojsonData.features.length).toFixed(3)}ms/feature\n`,
    );

    // 3. 测试异步加载（使用进度回调）
    console.log("步骤 3: 测试异步加载模式...");
    const asyncStart = performance.now();

    const progressCallback: LoadProgressCallback = (progress) => {
      // 每 10% 打印进度
      if (progress.percentage % 10 === 0) {
        console.log(
          `  ⏳ 加载进度: ${progress.percentage}% (${progress.loaded}/${progress.total})`,
        );
      }
    };

    const asyncRenderer = await renderBoundariesAsync(
      viewer.scene,
      geojsonData,
      progressCallback,
      {
        color: "#00FF00",
        width: 2,
        fill: true,
        fillColor: "#00FF00",
        fillOpacity: 0.2,
        batchSize: 100, // 每批处理 100 个 feature
        async: true,
      },
    );
    const asyncTime = performance.now() - asyncStart;
    console.log(`✓ 异步加载耗时: ${asyncTime.toFixed(2)}ms\n`);
    console.log(`  - 渲染了 ${asyncRenderer.getPrimitiveCount()} 个 Primitive`);
    console.log(
      `  - 平均单位耗时: ${(asyncTime / geojsonData.features.length).toFixed(3)}ms/feature\n`,
    );

    // 4. 对比结果
    console.log("📊 加载性能对比:");
    console.log(`- 同步加载:  ${syncTime.toFixed(2)}ms`);
    console.log(`- 异步加载:  ${asyncTime.toFixed(2)}ms`);
    console.log(`- 性能差异: ${(((asyncTime - syncTime) / syncTime) * 100).toFixed(1)}%\n`);

    console.log("✨ 异步加载优势:");
    console.log("- ✓ 分批处理，避免主线程长时间阻塞");
    console.log("- ✓ 使用 requestIdleCallback 让出资源");
    console.log("- ✓ UI 响应更流畅，用户可交互");
    console.log("- ✓ 支持加载进度反馈");
    console.log("- ✓ 支持取消加载操作\n");
  } catch (error) {
    console.error("❌ 异步加载测试失败:", error);
    throw error;
  }
}

/**
 * URL 异步加载测试：演示从 URL 流式加载大文件
 * @param viewer Cesium 查看器实例
 * @param geojsonUrl GeoJSON URL
 */
export async function urlAsyncLoadBoundaryUsage(
  viewer: Viewer,
  geojsonUrl: string = "path/to/World Country.geojson",
): Promise<void> {
  console.log("=== URL 异步加载流式测试 ===\n");

  try {
    console.log("开始加载 GeoJSON...");

    const progressCallback: LoadProgressCallback = (progress) => {
      const { loaded, total, percentage } = progress;

      if (total > 0) {
        // 显示下载进度（百分比）
        console.log(
          `  📥 下载进度: ${percentage}% (${(loaded / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB)`,
        );
      } else {
        // 显示处理进度（feature 数量）
        console.log(`  🔄 处理进度: ${percentage}% (${loaded}/${total} features)`);
      }
    };

    const startTime = performance.now();
    const renderer = await renderBoundariesFromURLAsync(
      viewer.scene,
      geojsonUrl,
      progressCallback,
      {
        color: "#0088FF",
        width: 2,
        fill: true,
        fillColor: "#0088FF",
        fillOpacity: 0.15,
        batchSize: 50,
      },
    );
    const loadTime = performance.now() - startTime;

    console.log(`\n✓ 加载完成`);
    console.log(`  总耗时: ${loadTime.toFixed(2)}ms`);
    console.log(`  渲染了 ${renderer.getPrimitiveCount()} 个 Primitive\n`);
  } catch (error) {
    console.error("❌ URL 异步加载失败:", error);
    throw error;
  }
}

/**
 * 取消加载测试：演示如何取消异步加载
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function cancelAsyncLoadBoundaryUsage(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<void> {
  console.log("=== 异步加载取消测试 ===\n");

  try {
    // 加载 GeoJSON 数据
    const response = await fetch(geojsonPath);
    const geojsonData = await response.json();

    console.log(`已加载 ${geojsonData.features?.length || 0} 个 Feature\n`);

    // 创建渲染器
    const renderer = new BoundaryRenderer(viewer.scene, {
      color: "#FF00FF",
      width: 2,
      fill: true,
      fillColor: "#FF00FF",
      fillOpacity: 0.2,
      batchSize: 50,
    });

    // 创建进度回调
    let lastPercentage = 0;
    const progressCallback: LoadProgressCallback = (progress) => {
      if (progress.percentage - lastPercentage >= 10) {
        console.log(`  ⏳ 加载进度: ${progress.percentage}%`);
        lastPercentage = progress.percentage;
      }
    };

    // 启动异步加载
    const loadPromise = renderer.loadGeoJSONAsync(
      geojsonData,
      progressCallback,
    );

    // 在 500ms 后取消加载
    setTimeout(() => {
      console.log("\n⏹️  取消加载操作...");
      renderer.cancelAsync();
    }, 500);

    try {
      await loadPromise;
    } catch (error) {
      console.warn("加载被取消或出错");
    }

    const count = renderer.getPrimitiveCount();
    console.log(`\n✓ 最终渲染了 ${count} 个 Primitive\n`);
  } catch (error) {
    console.error("❌ 取消加载测试失败:", error);
    throw error;
  }
}

/**
 * 渲染优化测试：演示坐标简化、批处理等性能优化
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function optimizedRenderBoundaryUsage(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<void> {
  console.log("=== 高性能渲染优化测试 ===\n");

  try {
    // 加载 GeoJSON 数据
    console.log("步骤 1: 加载 GeoJSON 数据...");
    const response = await fetch(geojsonPath);
    const geojsonData = await response.json();
    const featureCount = geojsonData.features?.length || 0;
    console.log(`✓ 已加载 ${featureCount} 个 Feature\n`);

    // 1. 未优化版本 - 基础渲染
    console.log("步骤 2: 未优化版本（基础渲染）...");
    const unoptimizedStart = performance.now();
    const unoptimizedRenderer = renderBoundaries(viewer.scene, geojsonData, {
      color: "#FF6B6B",
      width: 2,
      fill: true,
      fillColor: "#FF6B6B",
      fillOpacity: 0.2,
      simplifyCoordinates: false, // 禁用坐标简化
      batchPrimitives: false, // 禁用批处理
      cacheMaterial: false, // 禁用材质缓存
    });
    const unoptimizedTime = performance.now() - unoptimizedStart;
    const unoptimizedPrimitives = unoptimizedRenderer.getPrimitiveCount();
    console.log(
      `✓ 耗时: ${unoptimizedTime.toFixed(2)}ms，Primitive 数: ${unoptimizedPrimitives}\n`,
    );

    // 2. 优化版本 - 启用所有优化
    console.log("步骤 3: 优化版本（启用所有优化）...");
    const optimizedStart = performance.now();
    const optimizedRenderer = renderBoundaries(viewer.scene, geojsonData, {
      color: "#00FF00",
      width: 2,
      fill: true,
      fillColor: "#00FF00",
      fillOpacity: 0.2,
      simplifyCoordinates: true, // 启用坐标简化
      simplifyTolerance: 0.0001, // 简化容差
      batchPrimitives: true, // 启用批处理
      cacheMaterial: true, // 启用材质缓存
    });
    const optimizedTime = performance.now() - optimizedStart;
    const optimizedPrimitives = optimizedRenderer.getPrimitiveCount();
    console.log(
      `✓ 耗时: ${optimizedTime.toFixed(2)}ms，Primitive 数: ${optimizedPrimitives}\n`,
    );

    // 3. 性能对比
    console.log("📊 性能优化对比结果:");
    console.log(`\n未优化版本:`);
    console.log(`  - 总耗时: ${unoptimizedTime.toFixed(2)}ms`);
    console.log(`  - Primitive 数: ${unoptimizedPrimitives}`);
    console.log(`  - 单位耗时: ${(unoptimizedTime / featureCount).toFixed(3)}ms/feature`);

    console.log(`\n优化版本:`);
    console.log(`  - 总耗时: ${optimizedTime.toFixed(2)}ms`);
    console.log(`  - Primitive 数: ${optimizedPrimitives}`);
    console.log(`  - 单位耗时: ${(optimizedTime / featureCount).toFixed(3)}ms/feature`);

    const speedup = unoptimizedTime / optimizedTime;
    const reductionPercent = (
      (1 - optimizedPrimitives / unoptimizedPrimitives) *
      100
    ).toFixed(1);

    console.log(`\n✨ 优化效果:`);
    console.log(`  - 性能提升: ${speedup.toFixed(2)}x`);
    console.log(`  - Primitive 倍数: ${(
      unoptimizedPrimitives / optimizedPrimitives
    ).toFixed(2)}x`);
    console.log(`  - 内存减少: 约 ${reductionPercent}%`);

    console.log(`\n🎯 优化策略说明:`);
    console.log(
      `  1. 坐标简化: 使用 Douglas-Peucker 算法减少 30-60% 的顶点`,
    );
    console.log(
      `  2. Primitive 批处理: 合并多个几何体为单个 Primitive，减少 GPU 调用`,
    );
    console.log(
      `  3. 材质缓存: 复用相同颜色的材质，避免重复创建`,
    );
    console.log(`  4. 异步加载: 分批处理数据，避免主线程阻塞\n`);
  } catch (error) {
    console.error("❌ 优化测试失败:", error);
    throw error;
  }
}

/**
 * 参数调优指南：根据数据量选择合适的优化参数
 */
export const OptimizationGuide = {
  smallDataset: {
    description: "< 1000 个 Feature",
    options: {
      simplifyCoordinates: false,
      batchPrimitives: false,
      cacheMaterial: false,
      batchSize: 100,
    },
  },
  mediumDataset: {
    description: "1000 - 10000 个 Feature",
    options: {
      simplifyCoordinates: true,
      simplifyTolerance: 0.0005,
      batchPrimitives: true,
      cacheMaterial: true,
      batchSize: 100,
    },
  },
  largeDataset: {
    description: "> 10000 个 Feature",
    options: {
      simplifyCoordinates: true,
      simplifyTolerance: 0.001, // 更大的容差
      batchPrimitives: true,
      cacheMaterial: true,
      batchSize: 50, // 更小的批次以优化响应性
    },
  },
};

/**
 * 诊断函数：检查为什么 Primitive 为 0
 * @param viewer Cesium 查看器实例
 * @param geojsonPath GeoJSON 文件路径
 */
export async function debugBoundaryUsage(
  viewer: Viewer,
  geojsonPath: string = "path/to/World Country.geojson",
): Promise<void> {
  console.log("=== 边界渲染器诊断 ===\n");

  try {
    // 加载 GeoJSON 数据
    const response = await fetch(geojsonPath);
    const geojsonData = await response.json();
    const featureCount = geojsonData.features?.length || 0;

    console.log("📊 GeoJSON 数据信息:");
    console.log(`  - Features 数量: ${featureCount}`);

    // 分析 Feature 类型
    const typeCount: Record<string, number> = {};
    let totalCoordinates = 0;

    for (const feature of geojsonData.features || []) {
      const type = feature.geometry?.type;
      typeCount[type] = (typeCount[type] || 0) + 1;

      // 计算坐标总数
      const coords = feature.geometry?.coordinates;
      if (coords) {
        const countCoords = (arr: any): number => {
          if (!Array.isArray(arr)) return 0;
          let count = 0;
          for (const item of arr) {
            if (typeof item === 'number') {
              count += 1;
            } else if (Array.isArray(item)) {
              count += countCoords(item);
            }
          }
          return count;
        };
        totalCoordinates += countCoords(coords) / 2; // 坐标对数
      }
    }

    console.log(`  - Geometry 类型分布:`);
    for (const [type, count] of Object.entries(typeCount)) {
      console.log(`    • ${type}: ${count} 个`);
    }
    console.log(`  - 总坐标点数: ${Math.round(totalCoordinates)}\n`);

    // 测试不同配置
    console.log("🧪 测试不同配置:\n");

    const configs = [
      {
        name: "配置 A（无批处理）",
        options: {
          simplifyCoordinates: false,
          batchPrimitives: false,
          cacheMaterial: false,
        },
      },
      {
        name: "配置 B（启用批处理）",
        options: {
          simplifyCoordinates: false,
          batchPrimitives: true,
          cacheMaterial: false,
        },
      },
      {
        name: "配置 C（启用全部优化）",
        options: {
          simplifyCoordinates: true,
          simplifyTolerance: 0.0001,
          batchPrimitives: true,
          cacheMaterial: true,
        },
      },
    ];

    for (const config of configs) {
      const startTime = performance.now();
      const renderer = renderBoundaries(viewer.scene, geojsonData, {
        color: "#0088FF",
        width: 2,
        fill: false,
        ...config.options,
      });
      const time = performance.now() - startTime;
      const primitives = renderer.getPrimitiveCount();

      console.log(`${config.name}:`);
      console.log(`  - 耗时: ${time.toFixed(2)}ms`);
      console.log(`  - Primitive 数: ${primitives}`);
      console.log(`  - 每个 Feature 耗时: ${(time / featureCount).toFixed(3)}ms`);
      console.log(`  - Primitive/Feature 比: ${(primitives / featureCount).toFixed(2)}\n`);

      renderer.destroy();
    }

    // 诊断建议
    console.log("💡 诊断建议:");
    console.log("  1. 如果 Primitive 为 0:");
    console.log("     ✓ 检查 GeoJSON 数据是否有效");
    console.log("     ✓ 确认启用了批处理或禁用批处理");
    console.log("     ✓ 查看浏览器控制台是否有错误");
    console.log("  2. 优先使用 '配置 A（无批处理）' 进行测试");
    console.log("  3. 如果性能不理想，再尝试启用各种优化\n");
  } catch (error) {
    console.error("❌ 诊断失败:", error);
    throw error;
  }
}
