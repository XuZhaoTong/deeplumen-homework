// lib/cleaner.ts

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { ParsedArticle } from "./types";

/**
 * HTML 清洗器 - 使用 Mozilla Readability
 * 
 * 作用：
 * 1. 获取原始 HTML
 * 2. 去除广告、导航、侧边栏等噪音
 * 3. 提取核心内容（标题、正文、图片等）
 */
export class HTMLCleaner {
  /**
   * 清洗指定 URL 的 HTML 内容
   * 
   * 返回值包含原始 HTML 和清洗后的内容
   */
  async clean(url: string): Promise<ParsedArticle & { originalHTML?: string }> {
    try {
      // 1. 获取原始 HTML
      const html = await this.fetchHTML(url);
      
      // 2. 使用 Readability 清洗
      const article = this.parseWithReadability(html, url);
      
      if (!article) {
        throw new Error("无法解析页面内容，可能页面结构不符合 Readability 规范");
      }
      
      // 3. 附加原始 HTML（可选，用于对比展示）
      return {
        ...article,
        originalHTML: html,
      };
    } catch (error) {
      throw new Error(`HTML 清洗失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 获取 URL 的 HTML 内容
   */
  private async fetchHTML(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; GEOBot/1.0; +https://example.com/bot)",
        },
        // 10 秒超时
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("text/html")) {
        throw new Error(`不支持的内容类型: ${contentType}`);
      }
      
      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("请求超时");
      }
      throw error;
    }
  }
  
  /**
   * 使用 Readability 解析 HTML
   */
  private parseWithReadability(html: string, url: string): ParsedArticle | null {
    // 创建虚拟 DOM
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // 使用 Readability 解析
    const reader = new Readability(document, {
      // 调试模式（可选）
      debug: false,
      // 最大元素解析数量
      maxElemsToParse: 0,
      // 字符阈值
      charThreshold: 500,
    });
    
    const article = reader.parse();
    
    return article;
  }
  
  /**
   * 验证清洗后的内容是否有效
   */
  validateArticle(article: ParsedArticle): boolean {
    return !!(
      article.title &&
      article.content &&
      article.textContent &&
      article.textContent.length > 100 // 至少 100 字符
    );
  }
}

/**
 * 导出单例
 */
export const htmlCleaner = new HTMLCleaner();
