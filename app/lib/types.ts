// lib/types.ts

export interface IR {
  metadata: {
    url: string;
    title: string;
    author?: string;
    publishDate?: string;
    excerpt: string;
    siteName?: string;
    lang?: string;
  };
  content: {
    headings: Array<{
      level: number;
      text: string;
      id?: string;
    }>;
    paragraphs: string[];
    images: Array<{
      src: string;
      alt: string;
      caption?: string;
      width?: number;
      height?: number;
    }>;
    lists?: Array<{
      type: "ul" | "ol";
      items: string[];
    }>;
    videos?: Array<{
      src: string;
      poster?: string;
      caption?: string;
    }>;
  };
  entities?: Array<{
    type: "Product" | "Article" | "Person" | "Organization" | "Event";
    properties: Record<string, never>;
  }>;
  semantic: {
    mainEntityType: SchemaType;
    keywords?: string[];
    readingTime?: number;
    wordCount?: number;
  };
  raw?: {
    textContent: string;
    htmlContent: string;
    length: number;
  };
}

/**
 * Readability 返回的文章类型
 *
 * 注意：Readability 库返回的是 null，但我们在使用前会先验证
 * 所以这里定义为必选字段 + 可选字段，使用更严格的类型
 */
export interface ParsedArticle {
  /** 文章标题（必选） */
  title: string;
  /** 清洗后的 HTML 内容（必选） */
  content: string;
  /** 纯文本内容（必选） */
  textContent: string;
  /** 内容长度（必选） */
  length: number;
  /** 摘要（可选） */
  excerpt?: string;
  /** 作者署名（可选） */
  byline?: string;
  /** 文本方向（可选） */
  dir?: string;
  /** 网站名称（可选） */
  siteName?: string;
  /** 语言代码（可选） */
  lang?: string;
  /** 发布时间（可选） */
  publishedTime?: string;
}

/**
 * Readability 原始返回类型（用于内部验证）
 * 保留 null 类型以匹配 Readability 库的实际返回
 */
export interface ReadabilityResult {
  title: string | null;
  content: string | null;
  textContent: string | null;
  length: number | null;
  excerpt: string | null;
  byline: string | null;
  dir: string | null;
  siteName: string | null;
  lang: string | null;
  publishedTime: string | null;
}

/**
 * API 响应类型
 */
export interface ParseResponse {
  success: boolean;
  ir?: IR;
  geoHTML?: string;
  originalHTML?: string; // 原始 HTML（用于对比展示）
  originalTitle?: string;
  error?: string;
}

/**
 * Schema.org 实体类型
 */
export type SchemaType =
  | "Product"
  | "Article"
  | "BlogPosting"
  | "NewsArticle"
  | "WebPage"
  | "Person"
  | "Organization"
  | "Event";
