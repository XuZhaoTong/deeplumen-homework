// lib/cache.ts

/**
 * 缓存管理器
 *
 * 功能：
 * 1. 缓存 IR 数据，避免重复解析
 * 2. 支持 TTL（过期时间）
 * 3. 内存缓存（可扩展为 Redis）
 *
 * 优化效果：
 * - 缓存命中时响应时间 < 50ms
 * - 减少网络请求和 CPU 消耗
 * - 支持高并发场景
 */

import type { IR } from "./types";

/**
 * 缓存项
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * 缓存配置
 */
interface CacheConfig {
  // TTL（秒）
  ttl: number;

  // 最大缓存数量
  maxSize: number;

  // 是否启用缓存
  enabled: boolean;
}

/**
 * 缓存统计
 */
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 3600, // 1 小时
  maxSize: 1000, // 最多缓存 1000 个页面
  enabled: true,
};

export class Cache<T = IR> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;

  // 统计信息
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 定期清理过期缓存
    this.startCleanupTimer();
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const item = this.cache.get(key);

    // 未命中
    if (!item) {
      this.misses++;
      return null;
    }

    // 已过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // 命中
    this.hits++;
    return item.data;
  }

  /**
   * 设置缓存
   */
  set(key: string, data: T, ttl?: number): void {
    if (!this.config.enabled) {
      return;
    }

    // 检查缓存大小，如果超过限制，删除最旧的项
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const actualTTL = ttl || this.config.ttl;
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + actualTTL * 1000,
    };

    this.cache.set(key, item);
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * 获取或设置（常用模式）
   *
   * @param key 缓存键
   * @param factory 工厂函数，用于生成数据（缓存未命中时）
   * @param ttl 可选的 TTL
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = this.get(key);
    if (cached) {
      console.log(`[Cache] 命中: ${key}`);
      return cached;
    }

    console.log(`[Cache] 未命中: ${key}，开始生成...`);

    // 生成数据
    const data = await factory();

    // 存入缓存
    this.set(key, data, ttl);

    return data;
  }

  /**
   * 删除最旧的缓存项
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[Cache] 淘汰旧缓存: ${oldestKey}`);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Cache] 清理 ${cleanedCount} 个过期缓存`);
    }
  }

  /**
   * 启动定时清理
   */
  private startCleanupTimer(): void {
    // 每 5 分钟清理一次过期缓存
    setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * 生成缓存键（工具方法）
   */
  static generateKey(url: string): string {
    // 使用 URL 作为键，去除 query 参数中的时间戳等无关参数
    try {
      const urlObj = new URL(url);

      // 移除常见的追踪参数
      const paramsToRemove = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "fbclid",
        "_t",
      ];
      paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));

      return urlObj.toString();
    } catch {
      // 如果 URL 无效，直接使用原始字符串
      return url;
    }
  }
}

/**
 * 导出全局单例（IR 缓存）
 */
export const irCache = new Cache<IR>({
  ttl: 3600, // 1 小时
  maxSize: 1000,
  enabled: true,
});

/**
 * 导出 HTML 缓存（原始 HTML）
 */
export const htmlCache = new Cache<string>({
  ttl: 1800, // 30 分钟（HTML 可能更新更快）
  maxSize: 500,
  enabled: true,
});

/**
 * 辅助函数：从缓存获取或解析
 *
 * 使用示例：
 * ```typescript
 * const ir = await getCachedIR(url, async () => {
 *   const article = await htmlCleaner.clean(url);
 *   return irGenerator.generate(article, url);
 * });
 * ```
 */
export async function getCachedIR(
  url: string,
  factory: () => Promise<IR>,
): Promise<IR> {
  const key = Cache.generateKey(url);
  return irCache.getOrSet(key, factory);
}

/**
 * 清除所有缓存
 */
export function clearAllCaches(): void {
  irCache.clear();
  htmlCache.clear();
  console.log("[Cache] 已清空所有缓存");
}

/**
 * 获取所有缓存统计
 */
export function getAllCacheStats(): {
  ir: CacheStats;
  html: CacheStats;
} {
  return {
    ir: irCache.getStats(),
    html: htmlCache.getStats(),
  };
}
