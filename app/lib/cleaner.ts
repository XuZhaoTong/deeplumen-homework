// lib/cleaner.ts

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { ParsedArticle, ReadabilityResult } from "./types";

/**
 * User-Agent 策略池
 * 包含一个自定义 Bot UA 和多个主流浏览器 UA
 */
const USER_AGENTS = [
  // 1. 默认：表明身份的友好 Bot
  "Mozilla/5.0 (compatible; GEOBot/1.0; +https://deeplumen.app/bot)",
  // 2. 备用：Chrome macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  // 3. 备用：Chrome Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  // 4. 备用：Firefox
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
];

/**
 * 自定义错误类型
 */
export class HTMLCleanerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "HTMLCleanerError";
  }
}

export class HTMLCleaner {
  /**
   * 清洗指定 URL 的 HTML 内容
   */
  async clean(url: string): Promise<ParsedArticle & { originalHTML?: string }> {
    try {
      // 验证 URL 格式
      this.validateURL(url);

      // 1. 获取原始 HTML (带重试和 UA 切换)
      const html = await this.fetchHTMLWithRetry(url);

      // 2. 使用 Readability 清洗
      const article = this.parseWithReadability(html, url);

      if (!article) {
        throw new HTMLCleanerError(
          "无法解析页面内容，可能页面结构不符合 Readability 规范",
          "PARSE_FAILED",
        );
      }

      return {
        ...article,
        originalHTML: html,
      };
    } catch (error) {
      if (error instanceof HTMLCleanerError) {
        throw error;
      }

      throw new HTMLCleanerError(
        `HTML 清洗失败: ${error instanceof Error ? error.message : String(error)}`,
        "CLEAN_FAILED",
        error,
      );
    }
  }

  /**
   * 验证 URL 格式
   */
  private validateURL(url: string): void {
    try {
      const urlObj = new URL(url);

      // 只支持 http/https 协议
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new HTMLCleanerError(
          `不支持的协议: ${urlObj.protocol}，仅支持 http/https`,
          "INVALID_PROTOCOL",
        );
      }
    } catch (error) {
      if (error instanceof HTMLCleanerError) {
        throw error;
      }
      throw new HTMLCleanerError(
        `无效的 URL 格式: ${url}`,
        "INVALID_URL",
        error,
      );
    }
  }

  /**
   * 获取 HTML 内容（带智能重试机制）
   * @param maxRetries 最大重试次数，默认 3 次
   */
  private async fetchHTMLWithRetry(
    url: string,
    maxRetries = 3,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 策略：首次尝试用 Bot UA，重试时切换为随机浏览器 UA
        const userAgent =
          attempt === 0
            ? USER_AGENTS[0]
            : USER_AGENTS[
                1 + Math.floor(Math.random() * (USER_AGENTS.length - 1))
              ];

        // 动态超时：每次重试增加 2 秒超时时间 (10s -> 12s -> 14s)
        const timeoutMs = 10000 + attempt * 2000;

        console.log(
          `[Fetch] 尝试 ${attempt + 1}/${maxRetries + 1}: ${url} (UA: ${attempt === 0 ? "Bot" : "Browser"})`,
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          headers: {
            "User-Agent": userAgent,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 成功情况
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (!contentType?.includes("text/html")) {
            throw new HTMLCleanerError(
              `不支持的内容类型: ${contentType}`,
              "INVALID_CONTENT_TYPE",
            );
          }
          return await response.text();
        }

        // 错误处理逻辑
        // 404 不重试，直接抛出
        if (response.status === 404) {
          throw new HTMLCleanerError("Page not found (404)", "NOT_FOUND");
        }

        // 4xx (除了 429/403) 通常是客户端错误，不重试
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429 &&
          response.status !== 403
        ) {
          throw new HTMLCleanerError(
            `HTTP Error ${response.status}`,
            "HTTP_ERROR",
          );
        }

        // 抛出异常以触发重试 (5xx, 429, 403)
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是最后一次尝试，直接抛出异常
        if (attempt === maxRetries) break;

        // 如果是 HTMLCleanerError，直接停止重试
        if (error instanceof HTMLCleanerError) {
          throw error;
        }

        // 指数退避等待: 1s, 2s, 4s...
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(
          `[Fetch] 失败: ${lastError.message}. 等待 ${delay}ms 后重试...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new HTMLCleanerError(
      `获取 HTML 失败: ${lastError?.message}`,
      "FETCH_FAILED",
      lastError,
    );
  }

  /**
   * 使用 Readability 解析 HTML
   * 添加完善的错误处理
   */
  private parseWithReadability(
    html: string,
    url: string,
  ): ParsedArticle | null {
    try {
      // 验证 HTML 内容
      if (!html || html.trim().length === 0) {
        throw new HTMLCleanerError("HTML 内容为空", "EMPTY_HTML");
      }

      // 解析 HTML
      let document: Document;
      try {
        const parsed = parseHTML(html);
        document = parsed.document;
      } catch (error) {
        throw new HTMLCleanerError(
          "HTML 解析失败，可能是格式错误",
          "PARSE_ERROR",
          error,
        );
      }

      // 模拟更完整的浏览器环境属性
      try {
        Object.defineProperty(document, "documentURI", {
          value: url,
          writable: false,
        });
      } catch (error) {
        // 如果设置失败，不影响主流程，只记录警告
        console.warn("[Cleaner] 无法设置 documentURI:", error);
      }

      // Readability 核心解析
      let result: ReadabilityResult;
      try {
        const reader = new Readability(document, {
          debug: false,
          maxElemsToParse: 0,
          charThreshold: 200,
        });

        result = reader.parse() as ReadabilityResult;
      } catch (error) {
        throw new HTMLCleanerError(
          "Readability 解析失败",
          "READABILITY_ERROR",
          error,
        );
      }

      if (!result) {
        return null;
      }

      // 类型转换：将 Readability 的 null 类型转换为严格类型
      return this.convertToStrictType(result);
    } catch (error) {
      if (error instanceof HTMLCleanerError) {
        throw error;
      }
      throw new HTMLCleanerError(
        "解析过程发生未知错误",
        "UNKNOWN_ERROR",
        error,
      );
    }
  }

  /**
   * 将 Readability 返回的 null 类型转换为严格类型
   * 确保必选字段不为空
   */
  private convertToStrictType(result: ReadabilityResult): ParsedArticle | null {
    // 验证必选字段
    if (!result.title || !result.content || !result.textContent) {
      console.warn("[Cleaner] 缺少必要字段:", {
        hasTitle: !!result.title,
        hasContent: !!result.content,
        hasTextContent: !!result.textContent,
      });
      return null;
    }

    // 验证内容长度
    if (result.length === null || result.length < 50) {
      console.warn("[Cleaner] 内容过短:", result.length);
      return null;
    }

    return {
      title: result.title,
      content: result.content,
      textContent: result.textContent,
      length: result.length,
      excerpt: result.excerpt ?? undefined,
      byline: result.byline ?? undefined,
      dir: result.dir ?? undefined,
      siteName: result.siteName ?? undefined,
      lang: result.lang ?? undefined,
      publishedTime: result.publishedTime ?? undefined,
    };
  }

  /**
   * 验证清洗后的内容是否有效
   */
  validateArticle(article: ParsedArticle | null): article is ParsedArticle {
    if (!article) {
      return false;
    }

    // 验证必选字段
    if (!article.title || !article.content || !article.textContent) {
      return false;
    }

    // 验证内容长度
    if (article.textContent.length < 50) {
      return false;
    }

    return true;
  }
}

export const htmlCleaner = new HTMLCleaner();
