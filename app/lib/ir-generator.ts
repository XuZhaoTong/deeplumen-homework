// lib/ir-generator.ts

import * as cheerio from "cheerio";
import type { IR, ParsedArticle, SchemaType } from "./types";

/**
 * IR 生成错误类型
 */
export class IRGeneratorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "IRGeneratorError";
  }
}

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
    try {
      // 验证输入
      this.validateArticle(article);
      this.validateURL(url);

      // 加载 HTML 内容
      let $: cheerio.CheerioAPI;
      try {
        $ = cheerio.load(article.content);
      } catch (error) {
        throw new IRGeneratorError(
          "无法解析 HTML 内容",
          "CHEERIO_LOAD_FAILED",
          error,
        );
      }

      // 提取内容元素（带错误处理）
      const headings = this.safeExtractHeadings($);
      const paragraphs = this.safeExtractParagraphs($);
      const images = this.safeExtractImages($, url);
      const lists = this.safeExtractLists($);
      const videos = this.safeExtractVideos($);

      // 检测主要实体类型
      const mainEntityType = this.detectEntityType(article, $);

      // 提取关键词
      const keywords = this.extractKeywords(article.textContent);

      // 计算阅读时间（假设每分钟 200 字）
      const wordCount = article.textContent.length;
      const readingTime = Math.ceil(wordCount / 200);

      return {
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
    } catch (error) {
      if (error instanceof IRGeneratorError) {
        throw error;
      }
      throw new IRGeneratorError("IR 生成失败", "GENERATION_FAILED", error);
    }
  }

  /**
   * 验证文章对象
   */
  private validateArticle(article: ParsedArticle): void {
    if (!article) {
      throw new IRGeneratorError("文章对象为空", "ARTICLE_NULL");
    }

    if (!article.content) {
      throw new IRGeneratorError("文章内容为空，无法生成 IR", "CONTENT_EMPTY");
    }

    if (!article.title) {
      throw new IRGeneratorError("文章标题为空", "TITLE_EMPTY");
    }

    if (!article.textContent) {
      throw new IRGeneratorError("文章纯文本内容为空", "TEXT_CONTENT_EMPTY");
    }
  }

  /**
   * 验证 URL
   */
  private validateURL(url: string): void {
    try {
      new URL(url);
    } catch {
      throw new IRGeneratorError(`无效的 URL: ${url}`, "INVALID_URL");
    }
  }

  /**
   * 安全提取标题（h1-h6）
   */
  private safeExtractHeadings(
    $: cheerio.CheerioAPI,
  ): IR["content"]["headings"] {
    const headings: IR["content"]["headings"] = [];

    try {
      $("h1, h2, h3, h4, h5, h6").each((i, el) => {
        try {
          const $el = $(el);
          const text = $el.text().trim();

          if (text) {
            const level = parseInt(el.tagName[1]);

            // 验证 level 是否有效
            if (isNaN(level) || level < 1 || level > 6) {
              console.warn(`[IR] 无效的标题级别: ${el.tagName}`);
              return;
            }

            headings.push({
              level,
              text,
              id: $el.attr("id"),
            });
          }
        } catch (error) {
          console.warn(`[IR] 提取标题失败 (索引 ${i}):`, error);
        }
      });
    } catch (error) {
      console.error("[IR] 批量提取标题失败:", error);
    }

    return headings;
  }

  /**
   * 安全提取段落
   */
  private safeExtractParagraphs($: cheerio.CheerioAPI): string[] {
    const paragraphs: string[] = [];

    try {
      $("p").each((i, el) => {
        try {
          const text = $(el).text().trim();

          // 过滤太短的段落（少于 20 字符）
          if (text && text.length >= 20) {
            paragraphs.push(text);
          }
        } catch (error) {
          console.warn(`[IR] 提取段落失败 (索引 ${i}):`, error);
        }
      });
    } catch (error) {
      console.error("[IR] 批量提取段落失败:", error);
    }

    return paragraphs;
  }

  /**
   * 安全提取图片
   */
  private safeExtractImages(
    $: cheerio.CheerioAPI,
    baseUrl: string,
  ): IR["content"]["images"] {
    const images: IR["content"]["images"] = [];

    try {
      $("img").each((i, el) => {
        try {
          const $el = $(el);
          let src: string | null | undefined =
            $el.attr("src") || $el.attr("data-src");

          if (!src) return;

          // 处理相对路径
          src = this.normalizeURL(src, baseUrl);
          if (!src) return;

          const alt = $el.attr("alt") || "";

          // 安全解析宽高
          const width = this.safeParseInt($el.attr("width"));
          const height = this.safeParseInt($el.attr("height"));

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
        } catch (error) {
          console.warn(`[IR] 提取图片失败 (索引 ${i}):`, error);
        }
      });
    } catch (error) {
      console.error("[IR] 批量提取图片失败:", error);
    }

    return images;
  }

  /**
   * 安全提取列表
   */
  private safeExtractLists(
    $: cheerio.CheerioAPI,
  ): NonNullable<IR["content"]["lists"]> {
    const lists: NonNullable<IR["content"]["lists"]> = [];

    try {
      $("ul, ol").each((i, el) => {
        try {
          const $el = $(el);
          const type = el.tagName.toLowerCase() as "ul" | "ol";
          const items: string[] = [];

          $el.find("> li").each((j, li) => {
            try {
              const text = $(li).text().trim();
              if (text) {
                items.push(text);
              }
            } catch (error) {
              console.warn(`[IR] 提取列表项失败 (列表 ${i}, 项 ${j}):`, error);
            }
          });

          if (items.length > 0) {
            lists.push({ type, items });
          }
        } catch (error) {
          console.warn(`[IR] 提取列表失败 (索引 ${i}):`, error);
        }
      });
    } catch (error) {
      console.error("[IR] 批量提取列表失败:", error);
    }

    return lists;
  }

  /**
   * 安全提取视频
   */
  private safeExtractVideos(
    $: cheerio.CheerioAPI,
  ): NonNullable<IR["content"]["videos"]> {
    const videos: NonNullable<IR["content"]["videos"]> = [];

    try {
      // 提取 <video> 标签
      $("video").each((i, el) => {
        try {
          const $el = $(el);
          const src = $el.attr("src") || $el.find("source").attr("src");
          const poster = $el.attr("poster");

          if (src) {
            videos.push({
              src,
              poster,
            });
          }
        } catch (error) {
          console.warn(`[IR] 提取 video 标签失败 (索引 ${i}):`, error);
        }
      });

      // 提取 iframe（YouTube, Vimeo 等）
      $("iframe").each((i, el) => {
        try {
          const $el = $(el);
          const src = $el.attr("src");

          if (
            src &&
            (src.includes("youtube.com") || src.includes("vimeo.com"))
          ) {
            videos.push({ src });
          }
        } catch (error) {
          console.warn(`[IR] 提取 iframe 视频失败 (索引 ${i}):`, error);
        }
      });
    } catch (error) {
      console.error("[IR] 批量提取视频失败:", error);
    }

    return videos;
  }

  /**
   * 检测主要实体类型
   */
  private detectEntityType(
    article: ParsedArticle,
    $: cheerio.CheerioAPI,
  ): SchemaType {
    try {
      const content = article.textContent.toLowerCase();

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
    } catch (error) {
      console.warn("[IR] 实体类型检测失败，使用默认值:", error);
      return "Article";
    }
  }

  /**
   * 提取关键词（简单实现）
   */
  private extractKeywords(text: string): string[] {
    try {
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
      return Array.from(wordCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
    } catch (error) {
      console.warn("[IR] 关键词提取失败:", error);
      return [];
    }
  }

  /**
   * 生成摘要（如果原文没有）
   */
  private generateExcerpt(text: string, maxLength: number = 200): string {
    try {
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
        truncated.lastIndexOf("？"),
      );

      if (lastPeriod > 50) {
        return truncated.slice(0, lastPeriod + 1);
      }

      return truncated + "...";
    } catch (error) {
      console.warn("[IR] 摘要生成失败:", error);
      return text.slice(0, 200) + "...";
    }
  }

  /**
   * 规范化 URL（处理相对路径）
   */
  private normalizeURL(src: string, baseUrl: string): string | null {
    try {
      // 处理相对路径
      if (src.startsWith("/")) {
        const urlObj = new URL(baseUrl);
        return `${urlObj.protocol}//${urlObj.host}${src}`;
      } else if (src.startsWith("//")) {
        return `https:${src}`;
      } else if (src.startsWith("http")) {
        return src;
      }

      // 跳过无效的 src
      return null;
    } catch (error) {
      console.warn(`[IR] URL 规范化失败: ${src}`, error);
      return null;
    }
  }

  /**
   * 安全解析整数
   */
  private safeParseInt(value: string | undefined): number | undefined {
    if (!value) return undefined;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
}

/**
 * 导出单例
 */
export const irGenerator = new IRGenerator();
