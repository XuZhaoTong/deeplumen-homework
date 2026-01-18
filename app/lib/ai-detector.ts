/**
 * 已知的 AI/LLM User-Agent 关键词
 *
 * 只包含明确的 AI 服务，避免误判普通爬虫
 */
const AI_USER_AGENTS = [
  // OpenAI (ChatGPT)
  "ChatGPT-User", // ChatGPT 实时检索网页内容回答用户问题
  "OAI-SearchBot", // ChatGPT 搜索索引
  "GPTBot", // OpenAI 收集训练数据

  // Anthropic (Claude)
  "ClaudeBot", // Claude 爬取训练数据
  "Claude-User", // Claude 用户触发的实时网页访问
  "claude-web", // Claude 网页爬取
  "anthropic-ai", // Anthropic 批量模型训练

  // Google (Gemini)
  "Google-Extended", // Gemini 模型训练数据爬取
  "GoogleOther", // Google 内部研发用途
  "Google-CloudVertexBot", // Google Cloud Vertex AI

  // Microsoft (Bing/Copilot)
  "BingBot", // Bing 爬虫，支持 Copilot

  // Perplexity
  "PerplexityBot", // Perplexity 索引构建器
  "Perplexity-User", // Perplexity 用户触发的实时访问

  // Meta (Facebook)
  "meta-externalagent", // Meta AI 搜索爬取和实时检索
  "meta-externalfetcher", // Meta 检索用户提供的特定 URL
  "FacebookBot", // Facebook 语音识别技术的语言模型
  "facebookexternalhit", // Facebook 社交预览及 AI 功能

  // Amazon
  "Amazonbot", // Amazon 爬虫，用于 Alexa 等服务

  // Apple
  "Applebot", // Apple 爬虫，用于 Siri、Spotlight、Safari
  "Applebot-Extended", // Apple 生成式 AI 模型训练

  // ByteDance (字节跳动)
  "Bytespider", // 字节跳动爬虫，用于豆包等 AI 模型训练

  // Other AI Platforms
  "CCBot", // Common Crawl 开放数据集爬虫
  "cohere-ai", // Cohere AI 爬虫
  "ImagesiftBot", // 反向图片搜索工具
  "Diffbot", // AI 网页数据提取
  "YouBot", // You.com AI 搜索
  "LinkedInBot", // LinkedIn AI 功能
];

/**
 * 可疑但需要进一步验证的 User-Agent
 * （这些可能是 AI，但也可能是普通工具）
 */
const SUSPICIOUS_USER_AGENTS = ["python-requests", "curl", "wget"];

/**
 * 配置选项
 */
interface AIDetectorConfig {
  // 是否启用严格模式（只信任明确的 AI User-Agent）
  strictMode: boolean;

  // 是否检查可疑 User-Agent
  checkSuspicious: boolean;

  // 自定义 AI User-Agent 列表
  customAIUserAgents?: string[];

  // 是否启用 IP 验证（暂未实现）
  enableIPVerification?: boolean;
}

const DEFAULT_CONFIG: AIDetectorConfig = {
  strictMode: true,
  checkSuspicious: false,
  customAIUserAgents: [],
  enableIPVerification: false,
};

export class AIDetector {
  private config: AIDetectorConfig;

  constructor(config: Partial<AIDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 检测请求是否来自 AI/Bot
   */
  isAI(request: Request): boolean {
    // 方法 1: 检查 User-Agent（最重要）
    const uaResult = this.checkUserAgent(request);
    if (uaResult === true) {
      return true;
    }

    // 如果是严格模式，只信任明确的 User-Agent
    if (this.config.strictMode && uaResult === false) {
      // 即使其他方法检测到，也不认为是 AI
      // 除非是明确的自定义标识（Header/Query）
      return this.checkCustomHeaders(request) || this.checkQueryParams(request);
    }

    // 非严格模式：继续检查其他方法

    // 方法 2: 检查自定义头（明确标识）
    if (this.checkCustomHeaders(request)) {
      return true;
    }

    // 方法 3: 检查 Query 参数（明确标识）
    if (this.checkQueryParams(request)) {
      return true;
    }

    // 方法 4: 检查 Accept 头（辅助判断，不作为主要依据）
    // 注意：这个方法容易误判，所以只在非严格模式下启用
    if (!this.config.strictMode && this.checkAcceptHeader(request)) {
      return true;
    }

    return false;
  }

  /**
   * 检查 User-Agent
   *
   * @returns true=确定是AI, false=确定不是AI, null=不确定
   */
  private checkUserAgent(request: Request): boolean | null {
    const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

    // 空 User-Agent 直接返回 false
    if (!userAgent) {
      return false;
    }

    // 1. 检查明确的 AI User-Agent
    const allAIUserAgents = [
      ...AI_USER_AGENTS,
      ...(this.config.customAIUserAgents || []),
    ];

    for (const keyword of allAIUserAgents) {
      if (userAgent.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // 2. 检查可疑的 User-Agent（可选）
    if (this.config.checkSuspicious) {
      for (const keyword of SUSPICIOUS_USER_AGENTS) {
        if (userAgent.includes(keyword.toLowerCase())) {
          return null; // 不确定，需要进一步验证
        }
      }
    }

    // 3. 明确不是 AI（普通浏览器）
    if (this.isBrowserUserAgent(userAgent)) {
      return false;
    }

    return false;
  }

  /**
   * 判断是否为普通浏览器的 User-Agent
   */
  private isBrowserUserAgent(userAgent: string): boolean {
    const browserKeywords = [
      "mozilla",
      "chrome",
      "safari",
      "firefox",
      "edge",
      "opera",
    ];

    // 如果包含浏览器关键词，且不是 headless，认为是普通浏览器
    const hasBrowser = browserKeywords.some((k) => userAgent.includes(k));
    const isHeadless = userAgent.includes("headless");

    return hasBrowser && !isHeadless;
  }

  /**
   * 检查 Accept 头
   *
   * 注意：这个方法可能误判，只作为辅助判断
   */
  private checkAcceptHeader(request: Request): boolean {
    const accept = request.headers.get("accept")?.toLowerCase() || "";

    // AI 通常偏好结构化数据
    // 但这也可能是 API 请求，所以不能作为唯一依据
    const prefersStructured =
      accept.includes("application/json") ||
      accept.includes("application/ld+json") ||
      (accept.includes("text/plain") && !accept.includes("text/html"));

    // 只有在没有 HTML 的情况下才认为可能是 AI
    const noHTML = !accept.includes("text/html");

    return prefersStructured && noHTML;
  }

  /**
   * 检查自定义头
   */
  private checkCustomHeaders(request: Request): boolean {
    // 自定义头: X-AI-Request: true
    const aiRequest = request.headers.get("x-ai-request");
    if (aiRequest === "true" || aiRequest === "1") {
      return true;
    }

    // 自定义头: X-Bot-Type: ai|llm
    const botType = request.headers.get("x-bot-type");
    if (botType === "ai" || botType === "llm") {
      return true;
    }

    // 自定义头: X-AI-Agent（自定义标识）
    const aiAgent = request.headers.get("x-ai-agent");
    if (aiAgent) {
      return true;
    }

    return false;
  }

  /**
   * 检查 Query 参数
   */
  private checkQueryParams(request: Request): boolean {
    const url = new URL(request.url);

    // ?ai=true
    if (url.searchParams.get("ai") === "true") {
      return true;
    }

    // ?bot=1
    if (url.searchParams.get("bot") === "1") {
      return true;
    }

    // ?format=geo
    if (url.searchParams.get("format") === "geo") {
      return true;
    }

    // ?geo=1
    if (url.searchParams.get("geo") === "1") {
      return true;
    }

    return false;
  }

  /**
   * 获取检测详情（调试用）
   */
  getDetectionDetails(request: Request): {
    isAI: boolean;
    confidence: "high" | "medium" | "low";
    reasons: string[];
    userAgent: string;
    accept: string;
    method: string;
  } {
    const reasons: string[] = [];
    let confidence: "high" | "medium" | "low" = "low";

    // 检查各项指标
    const uaResult = this.checkUserAgent(request);
    if (uaResult === true) {
      reasons.push("User-Agent 匹配已知 AI 服务");
      confidence = "high";
    } else if (uaResult === null) {
      reasons.push("User-Agent 可疑，需要进一步验证");
      confidence = "medium";
    }

    if (this.checkCustomHeaders(request)) {
      reasons.push("包含自定义 AI 标识头");
      confidence = "high";
    }

    if (this.checkQueryParams(request)) {
      reasons.push("URL 参数指定 AI 模式");
      confidence = "high";
    }

    if (this.checkAcceptHeader(request)) {
      reasons.push("Accept 头偏好结构化数据");
      if (confidence === "low") {
        confidence = "medium";
      }
    }

    const isAI = this.isAI(request);

    return {
      isAI,
      confidence,
      reasons: reasons.length > 0 ? reasons : ["未检测到 AI 特征"],
      userAgent: request.headers.get("user-agent") || "未提供",
      accept: request.headers.get("accept") || "未提供",
      method: isAI
        ? this.checkCustomHeaders(request) || this.checkQueryParams(request)
          ? "明确标识"
          : "User-Agent 识别"
        : "无",
    };
  }

  /**
   * 获取 AI 服务类型（如果可识别）
   */
  getAIServiceType(request: Request): string | null {
    const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";

    if (userAgent.includes("gptbot") || userAgent.includes("chatgpt")) {
      return "OpenAI";
    }
    if (userAgent.includes("claude") || userAgent.includes("anthropic")) {
      return "Anthropic";
    }
    if (
      userAgent.includes("google-extended") ||
      userAgent.includes("gemini") ||
      userAgent.includes("bard")
    ) {
      return "Google";
    }
    if (userAgent.includes("perplexity")) {
      return "Perplexity";
    }
    if (userAgent.includes("youbot")) {
      return "You.com";
    }
    if (userAgent.includes("applebot-extended")) {
      return "Apple";
    }

    return null;
  }
}

/**
 * 导出单例（使用默认配置）
 */
export const aiDetector = new AIDetector();

/**
 * 导出配置类型（供外部使用）
 */
export type { AIDetectorConfig };

/**
 * 导出 AI User-Agent 列表（供测试使用）
 */
export { AI_USER_AGENTS };
