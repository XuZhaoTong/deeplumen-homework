// lib/cleaner.ts

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { ParsedArticle } from "./types";

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

export class HTMLCleaner {
  /**
   * 清洗指定 URL 的 HTML 内容
   */
  async clean(url: string): Promise<ParsedArticle & { originalHTML?: string }> {
    try {
      // 1. 获取原始 HTML (带重试和 UA 切换)
      const html = await this.fetchHTMLWithRetry(url);

      // 2. 使用 Readability 清洗
      const article = this.parseWithReadability(html, url);

      if (!article) {
        throw new Error(
          "无法解析页面内容，可能页面结构不符合 Readability 规范",
        );
      }

      return {
        ...article,
        originalHTML: html,
      };
    } catch (error) {
      throw new Error(
        `HTML 清洗失败: ${error instanceof Error ? error.message : String(error)}`,
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
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8", // 模拟真实语言偏好
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 成功情况
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (!contentType?.includes("text/html")) {
            throw new Error(`不支持的内容类型: ${contentType}`);
          }
          return await response.text();
        }

        // 错误处理逻辑
        // 404 不重试，直接抛出
        if (response.status === 404) {
          throw new Error("Page not found (404)");
        }

        // 4xx (除了 429/403) 通常是客户端错误，不重试
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429 &&
          response.status !== 403
        ) {
          throw new Error(`HTTP Error ${response.status}`);
        }

        // 抛出异常以触发重试 (5xx, 429, 403)
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是最后一次尝试，直接抛出异常
        if (attempt === maxRetries) break;

        // 如果是 404 或特定不需要重试的错误，立即停止
        if (lastError.message.includes("404")) throw lastError;

        // 指数退避等待: 1s, 2s, 4s...
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(
          `[Fetch] 失败: ${lastError.message}. 等待 ${delay}ms 后重试...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * 使用 Readability 解析 HTML
   * (保持原有逻辑不变，只微调了 JSDOM 环境配置以提升兼容性)
   */
  private parseWithReadability(
    html: string,
    url: string,
  ): ParsedArticle | null {
    const { document } = parseHTML(html);

    // 模拟更完整的浏览器环境属性，有些页面脚本可能会检查这些
    Object.defineProperty(document, "documentURI", {
      value: url,
      writable: false,
    });

    // Readability 核心解析
    const reader = new Readability(document, {
      debug: false,
      maxElemsToParse: 0,
      charThreshold: 200, // 稍微降低阈值，防止短文章被忽略
    });

    const result = reader.parse();

    if (!result) return null;

    return {
      title: result.title ?? null,
      content: result.content ?? null,
      textContent: result.textContent ?? null,
      length: result.length ?? null,
      excerpt: result.excerpt ?? null,
      byline: result.byline ?? null,
      dir: result.dir ?? null,
      siteName: result.siteName ?? null,
      lang: result.lang ?? null,
      publishedTime: result.publishedTime ?? null,
    };
  }

  /**
   * 验证清洗后的内容是否有效
   */
  validateArticle(article: ParsedArticle | null): boolean {
    return !!(
      article &&
      article.title &&
      article.content &&
      article.textContent &&
      article.textContent.length > 50 // 放宽限制，有些短讯可能很短
    );
  }
}

export const htmlCleaner = new HTMLCleaner();
