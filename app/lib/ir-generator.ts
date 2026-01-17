// lib/ir-generator.ts

import * as cheerio from "cheerio";
import type { IR, ParsedArticle, SchemaType } from "./types";

/**
 * IR 生成器 - 将清洗后的 HTML 转换为中间表示
 * 
 * 作用：
 * 1. 解析清洗后的 HTML 结构
 * 2. 提取标题、段落、图片、列表等元素
 * 3. 识别语义信息（实体类型、关键词）
 * 4. 生成标准化的 IR 数据结构
 */
export class IRGenerator {
  /**
   * 从 ParsedArticle 生成 IR
   */
  generate(article: ParsedArticle, url: string): IR {
    const $ = cheerio.load(article.content);
    
    // 提取内容元素
    const headings = this.extractHeadings($);
    const paragraphs = this.extractParagraphs($);
    const images = this.extractImages($, url);
    const lists = this.extractLists($);
    const videos = this.extractVideos($);
    
    // 检测主要实体类型
    const mainEntityType = this.detectEntityType(article, $);
    
    // 提取关键词
    const keywords = this.extractKeywords(article.textContent);
    
    // 计算阅读时间（假设每分钟 200 字）
    const wordCount = article.textContent.length;
    const readingTime = Math.ceil(wordCount / 200);
    
    const ir: IR = {
      metadata: {
        url,
        title: article.title,
        author: article.byline,
        publishDate: article.publishedTime,
        excerpt: article.excerpt || this.generateExcerpt(article.textContent),
        siteName: article.siteName,
        lang: article.lang || "zh-CN",
      },
      content: {
        headings,
        paragraphs,
        images,
        lists: lists.length > 0 ? lists : undefined,
        videos: videos.length > 0 ? videos : undefined,
      },
      semantic: {
        mainEntityType,
        keywords,
        readingTime,
        wordCount,
      },
      raw: {
        textContent: article.textContent,
        htmlContent: article.content,
        length: article.length,
      },
    };
    
    return ir;
  }
  
  /**
   * 提取标题（h1-h6）
   */
  private extractHeadings($: cheerio.CheerioAPI) {
    const headings: IR["content"]["headings"] = [];
    
    $("h1, h2, h3, h4, h5, h6").each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      if (text) {
        headings.push({
          level: parseInt(el.tagName[1]),
          text,
          id: $el.attr("id"),
        });
      }
    });
    
    return headings;
  }
  
  /**
   * 提取段落
   */
  private extractParagraphs($: cheerio.CheerioAPI) {
    const paragraphs: string[] = [];
    
    $("p").each((i, el) => {
      const text = $(el).text().trim();
      
      // 过滤太短的段落（少于 20 字符）
      if (text && text.length >= 20) {
        paragraphs.push(text);
      }
    });
    
    return paragraphs;
  }
  
  /**
   * 提取图片
   */
  private extractImages($: cheerio.CheerioAPI, baseUrl: string) {
    const images: IR["content"]["images"] = [];
    
    $("img").each((i, el) => {
      const $el = $(el);
      let src = $el.attr("src") || $el.attr("data-src");
      
      if (!src) return;
      
      // 处理相对路径
      if (src.startsWith("/")) {
        const urlObj = new URL(baseUrl);
        src = `${urlObj.protocol}//${urlObj.host}${src}`;
      } else if (src.startsWith("//")) {
        src = `https:${src}`;
      } else if (!src.startsWith("http")) {
        return; // 跳过无效的 src
      }
      
      const alt = $el.attr("alt") || "";
      const width = $el.attr("width") ? parseInt($el.attr("width")!) : undefined;
      const height = $el.attr("height") ? parseInt($el.attr("height")!) : undefined;
      
      // 查找 caption（通常在 figure/figcaption 中）
      const $figure = $el.closest("figure");
      const caption = $figure.find("figcaption").text().trim() || undefined;
      
      images.push({
        src,
        alt,
        caption,
        width,
        height,
      });
    });
    
    return images;
  }
  
  /**
   * 提取列表
   */
  private extractLists($: cheerio.CheerioAPI) {
    const lists: NonNullable<IR["content"]["lists"]> = [];
    
    $("ul, ol").each((i, el) => {
      const $el = $(el);
      const type = el.tagName.toLowerCase() as "ul" | "ol";
      const items: string[] = [];
      
      $el.find("> li").each((j, li) => {
        const text = $(li).text().trim();
        if (text) {
          items.push(text);
        }
      });
      
      if (items.length > 0) {
        lists.push({ type, items });
      }
    });
    
    return lists;
  }
  
  /**
   * 提取视频
   */
  private extractVideos($: cheerio.CheerioAPI) {
    const videos: NonNullable<IR["content"]["videos"]> = [];
    
    $("video").each((i, el) => {
      const $el = $(el);
      const src = $el.attr("src") || $el.find("source").attr("src");
      const poster = $el.attr("poster");
      
      if (src) {
        videos.push({
          src,
          poster,
        });
      }
    });
    
    // 也检查 iframe（YouTube, Vimeo 等）
    $("iframe").each((i, el) => {
      const $el = $(el);
      const src = $el.attr("src");
      
      if (src && (src.includes("youtube.com") || src.includes("vimeo.com"))) {
        videos.push({ src });
      }
    });
    
    return videos;
  }
  
  /**
   * 检测主要实体类型
   */
  private detectEntityType(article: ParsedArticle, $: cheerio.CheerioAPI): SchemaType {
    const content = article.textContent.toLowerCase();
    const title = article.title.toLowerCase();
    
    // 检测是否为产品页面
    if (
      content.includes("价格") ||
      content.includes("购买") ||
      content.includes("库存") ||
      $('[itemprop="price"]').length > 0 ||
      $(".price").length > 0
    ) {
      return "Product";
    }
    
    // 检测是否为新闻文章
    if (
      article.publishedTime ||
      content.includes("记者") ||
      content.includes("报道") ||
      $('meta[property="article:published_time"]').length > 0
    ) {
      return "NewsArticle";
    }
    
    // 检测是否为博客文章
    if (
      article.byline ||
      content.includes("作者") ||
      $(".author").length > 0 ||
      $('[rel="author"]').length > 0
    ) {
      return "BlogPosting";
    }
    
    // 默认为文章
    return "Article";
  }
  
  /**
   * 提取关键词（简单实现）
   */
  private extractKeywords(text: string): string[] {
    // 移除标点符号和特殊字符
    const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, " ");
    
    // 分词（简单按空格分）
    const words = cleaned
      .split(/\s+/)
      .filter((word) => word.length >= 2 && word.length <= 10);
    
    // 统计词频
    const wordCount = new Map<string, number>();
    words.forEach((word) => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // 取前 10 个高频词
    const keywords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return keywords;
  }
  
  /**
   * 生成摘要（如果原文没有）
   */
  private generateExcerpt(text: string, maxLength: number = 200): string {
    const cleaned = text.trim();
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    // 截取前 maxLength 字符，并在最后一个句号处截断
    const truncated = cleaned.slice(0, maxLength);
    const lastPeriod = Math.max(
      truncated.lastIndexOf("。"),
      truncated.lastIndexOf("."),
      truncated.lastIndexOf("！"),
      truncated.lastIndexOf("？")
    );
    
    if (lastPeriod > 50) {
      return truncated.slice(0, lastPeriod + 1);
    }
    
    return truncated + "...";
  }
}

/**
 * 导出单例
 */
export const irGenerator = new IRGenerator();
