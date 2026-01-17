// lib/ai-detector.ts

/**
 * AI/Bot 访问检测器
 * 
 * 作用：根据请求特征判断是否来自 AI/Bot/Agent
 */

/**
 * 已知的 AI/Bot User-Agent 关键词
 */
const AI_USER_AGENTS = [
  // OpenAI
  "ChatGPT-User",
  "GPTBot",
  
  // Anthropic
  "Claude-Web",
  "anthropic-ai",
  
  // Google
  "Google-Extended",
  "Bard",
  "Gemini",
  
  // 其他 AI
  "PerplexityBot",
  "YouBot",
  "Applebot-Extended",
  
  // 通用爬虫（可选）
  "bot",
  "crawler",
  "spider",
  "scraper",
];

/**
 * AI 友好的 Accept 头特征
 */
const AI_ACCEPT_HEADERS = [
  "application/json",
  "application/ld+json",
  "text/plain",
  "*/*", // 很多 AI 会用这个
];

export class AIDetector {
  /**
   * 检测请求是否来自 AI/Bot
   */
  isAI(request: Request): boolean {
    // 方法 1: 检查 User-Agent
    if (this.checkUserAgent(request)) {
      return true;
    }
    
    // 方法 2: 检查 Accept 头
    if (this.checkAcceptHeader(request)) {
      return true;
    }
    
    // 方法 3: 检查自定义头（约定）
    if (this.checkCustomHeaders(request)) {
      return true;
    }
    
    // 方法 4: 检查 Query 参数
    if (this.checkQueryParams(request)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 检查 User-Agent
   */
  private checkUserAgent(request: Request): boolean {
    const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
    
    return AI_USER_AGENTS.some((keyword) =>
      userAgent.includes(keyword.toLowerCase())
    );
  }
  
  /**
   * 检查 Accept 头
   * 注意：这个方法可能误判，需要结合其他方法
   */
  private checkAcceptHeader(request: Request): boolean {
    const accept = request.headers.get("accept")?.toLowerCase() || "";
    
    // 如果只接受 JSON 或纯文本，可能是 AI
    if (
      accept.includes("application/json") ||
      accept.includes("application/ld+json") ||
      (accept.includes("text/plain") && !accept.includes("text/html"))
    ) {
      return true;
    }
    
    return false;
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
    
    // 自定义头: X-Bot-Type
    const botType = request.headers.get("x-bot-type");
    if (botType) {
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
    
    return false;
  }
  
  /**
   * 获取检测详情（调试用）
   */
  getDetectionDetails(request: Request): {
    isAI: boolean;
    reasons: string[];
    userAgent: string;
    accept: string;
  } {
    const reasons: string[] = [];
    
    if (this.checkUserAgent(request)) {
      reasons.push("User-Agent 匹配 AI/Bot 特征");
    }
    
    if (this.checkAcceptHeader(request)) {
      reasons.push("Accept 头偏好 JSON/纯文本");
    }
    
    if (this.checkCustomHeaders(request)) {
      reasons.push("包含自定义 AI 标识头");
    }
    
    if (this.checkQueryParams(request)) {
      reasons.push("URL 参数指定 AI 模式");
    }
    
    return {
      isAI: reasons.length > 0,
      reasons,
      userAgent: request.headers.get("user-agent") || "",
      accept: request.headers.get("accept") || "",
    };
  }
}

/**
 * 导出单例
 */
export const aiDetector = new AIDetector();
