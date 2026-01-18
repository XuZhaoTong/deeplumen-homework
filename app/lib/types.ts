// lib/types.ts

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
    mainEntityType: SchemaType; // 改用 SchemaType
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
 */
export interface ParsedArticle {
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
