// lib/config.ts

/**
 * GEO 系统配置
 */
export const config = {
  /**
   * Readability 配置
   */
  readability: {
    // 是否启用调试模式
    debug: false,
    // 最大解析元素数量（0 = 无限制）
    maxElemsToParse: 0,
    // 字符阈值（低于此值的内容会被忽略）
    charThreshold: 500,
  },
  
  /**
   * 获取 HTML 配置
   */
  fetch: {
    // 超时时间（毫秒）
    timeout: 10000,
    // User-Agent
    userAgent: "Mozilla/5.0 (compatible; GEOBot/1.0; +https://example.com/bot)",
  },
  
  /**
   * IR 生成配置
   */
  ir: {
    // 最小段落长度（字符）
    minParagraphLength: 20,
    // 摘要最大长度
    excerptMaxLength: 200,
    // 关键词数量
    keywordCount: 10,
    // 阅读速度（字符/分钟）
    readingSpeed: 200,
  },
  
  /**
   * GEO HTML 配置
   */
  geo: {
    // 是否包含基础样式
    includeStyles: true,
    // 是否包含 Open Graph 标签
    includeOpenGraph: true,
    // 语言
    defaultLang: "zh-CN",
  },
  
  /**
   * AI 检测配置
   */
  aiDetection: {
    // 是否启用严格模式（只有明确的 AI 标识才认为是 AI）
    strict: false,
    // 自定义 User-Agent 关键词
    customUserAgents: [],
  },
  
  /**
   * 缓存配置（可选）
   */
  cache: {
    // 是否启用缓存
    enabled: false,
    // 缓存时间（秒）
    ttl: 3600,
  },
};

/**
 * 允许运行时更新配置
 */
export function updateConfig(updates: Partial<typeof config>) {
  Object.assign(config, updates);
}
