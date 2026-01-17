// lib/geo-generator.ts

import type { IR } from "./types";

/**
 * GEO HTML 生成器 - 根据 IR 生成 AI-Friendly 的 HTML
 * 
 * 作用：
 * 1. 生成 JSON-LD 结构化数据
 * 2. 生成语义化的 HTML 标签
 * 3. 添加 Schema.org 标记（itemprop, itemscope）
 * 4. 去除冗余样式和交互逻辑
 */
export class GeoGenerator {
  /**
   * 从 IR 生成 GEO 优化的 HTML
   */
  generate(ir: IR): string {
    const jsonLD = this.generateJSONLD(ir);
    const bodyHTML = this.generateBodyHTML(ir);
    
    return this.wrapHTML(ir, jsonLD, bodyHTML);
  }
  
  /**
   * 生成 JSON-LD 结构化数据
   */
  private generateJSONLD(ir: IR): string {
    const jsonLD: any = {
      "@context": "https://schema.org",
      "@type": ir.semantic.mainEntityType,
      headline: ir.metadata.title,
      description: ir.metadata.excerpt,
      url: ir.metadata.url,
      inLanguage: ir.metadata.lang,
    };
    
    // 作者信息
    if (ir.metadata.author) {
      jsonLD.author = {
        "@type": "Person",
        name: ir.metadata.author,
      };
    }
    
    // 发布日期
    if (ir.metadata.publishDate) {
      jsonLD.datePublished = ir.metadata.publishDate;
    }
    
    // 网站名称
    if (ir.metadata.siteName) {
      jsonLD.publisher = {
        "@type": "Organization",
        name: ir.metadata.siteName,
      };
    }
    
    // 图片
    if (ir.content.images.length > 0) {
      const mainImage = ir.content.images[0];
      jsonLD.image = {
        "@type": "ImageObject",
        url: mainImage.src,
        caption: mainImage.alt || mainImage.caption,
      };
      
      if (mainImage.width) jsonLD.image.width = mainImage.width;
      if (mainImage.height) jsonLD.image.height = mainImage.height;
    }
    
    // 关键词
    if (ir.semantic.keywords && ir.semantic.keywords.length > 0) {
      jsonLD.keywords = ir.semantic.keywords.join(", ");
    }
    
    // 字数
    if (ir.semantic.wordCount) {
      jsonLD.wordCount = ir.semantic.wordCount;
    }
    
    // 产品特定字段
    if (ir.semantic.mainEntityType === "Product") {
      jsonLD.offers = {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
      };
    }
    
    return JSON.stringify(jsonLD, null, 2);
  }
  
  /**
   * 生成 Body HTML 内容
   */
  private generateBodyHTML(ir: IR): string {
    const sections: string[] = [];
    
    // 1. 文章头部（标题 + 元信息）
    sections.push(this.generateHeader(ir));
    
    // 2. 主要内容（标题 + 段落）
    sections.push(this.generateMainContent(ir));
    
    // 3. 图片区域
    if (ir.content.images.length > 0) {
      sections.push(this.generateImagesSection(ir));
    }
    
    // 4. 列表区域
    if (ir.content.lists && ir.content.lists.length > 0) {
      sections.push(this.generateListsSection(ir));
    }
    
    // 5. 视频区域
    if (ir.content.videos && ir.content.videos.length > 0) {
      sections.push(this.generateVideosSection(ir));
    }
    
    return sections.join("\n\n");
  }
  
  /**
   * 生成文章头部
   */
  private generateHeader(ir: IR): string {
    const parts: string[] = [
      `    <header>`,
      `      <h1 itemprop="headline">${this.escapeHTML(ir.metadata.title)}</h1>`,
    ];
    
    // 作者和日期
    const metaParts: string[] = [];
    if (ir.metadata.author) {
      metaParts.push(
        `<span itemprop="author" itemscope itemtype="https://schema.org/Person">`,
        `  <meta itemprop="name" content="${this.escapeHTML(ir.metadata.author)}">`,
        `  作者: ${this.escapeHTML(ir.metadata.author)}`,
        `</span>`
      );
    }
    
    if (ir.metadata.publishDate) {
      metaParts.push(
        `<time itemprop="datePublished" datetime="${ir.metadata.publishDate}">`,
        `  发布于: ${new Date(ir.metadata.publishDate).toLocaleDateString("zh-CN")}`,
        `</time>`
      );
    }
    
    if (metaParts.length > 0) {
      parts.push(`      <div class="meta">`);
      parts.push(`        ${metaParts.join(" · ")}`);
      parts.push(`      </div>`);
    }
    
    // 摘要
    if (ir.metadata.excerpt) {
      parts.push(
        `      <p itemprop="description" class="excerpt">`,
        `        ${this.escapeHTML(ir.metadata.excerpt)}`,
        `      </p>`
      );
    }
    
    parts.push(`    </header>`);
    
    return parts.join("\n");
  }
  
  /**
   * 生成主要内容
   */
  private generateMainContent(ir: IR): string {
    const parts: string[] = [`    <main itemprop="articleBody">`];
    
    // 组合标题和段落（保持原有顺序）
    let paragraphIndex = 0;
    
    // 如果有标题，按标题分组段落
    if (ir.content.headings.length > 0) {
      ir.content.headings.forEach((heading, i) => {
        // 添加标题
        parts.push(
          `      <section>`,
          `        <h${heading.level}${heading.id ? ` id="${heading.id}"` : ""}>`,
          `          ${this.escapeHTML(heading.text)}`,
          `        </h${heading.level}>`
        );
        
        // 添加该标题后的段落（简单实现：每个标题后跟 2-3 个段落）
        const paragraphsToAdd = Math.min(3, ir.content.paragraphs.length - paragraphIndex);
        for (let j = 0; j < paragraphsToAdd; j++) {
          if (paragraphIndex < ir.content.paragraphs.length) {
            parts.push(`        <p>${this.escapeHTML(ir.content.paragraphs[paragraphIndex])}</p>`);
            paragraphIndex++;
          }
        }
        
        parts.push(`      </section>`);
      });
    }
    
    // 添加剩余段落
    while (paragraphIndex < ir.content.paragraphs.length) {
      parts.push(`      <p>${this.escapeHTML(ir.content.paragraphs[paragraphIndex])}</p>`);
      paragraphIndex++;
    }
    
    parts.push(`    </main>`);
    
    return parts.join("\n");
  }
  
  /**
   * 生成图片区域
   */
  private generateImagesSection(ir: IR): string {
    const parts: string[] = [`    <section class="images">`];
    
    ir.content.images.forEach((image) => {
      parts.push(
        `      <figure itemprop="image" itemscope itemtype="https://schema.org/ImageObject">`,
        `        <img`,
        `          src="${this.escapeHTML(image.src)}"`,
        `          alt="${this.escapeHTML(image.alt)}"`,
        `          itemprop="url contentUrl"`,
        image.width ? `          width="${image.width}"` : "",
        image.height ? `          height="${image.height}"` : "",
        `        />`,
        image.caption
          ? `        <figcaption itemprop="caption">${this.escapeHTML(image.caption)}</figcaption>`
          : "",
        `      </figure>`
      );
    });
    
    parts.push(`    </section>`);
    
    return parts.filter((line) => line).join("\n");
  }
  
  /**
   * 生成列表区域
   */
  private generateListsSection(ir: IR): string {
    const parts: string[] = [`    <section class="lists">`];
    
    ir.content.lists!.forEach((list) => {
      const tag = list.type;
      parts.push(`      <${tag}>`);
      
      list.items.forEach((item) => {
        parts.push(`        <li>${this.escapeHTML(item)}</li>`);
      });
      
      parts.push(`      </${tag}>`);
    });
    
    parts.push(`    </section>`);
    
    return parts.join("\n");
  }
  
  /**
   * 生成视频区域
   */
  private generateVideosSection(ir: IR): string {
    const parts: string[] = [`    <section class="videos">`];
    
    ir.content.videos!.forEach((video) => {
      if (video.src.includes("youtube.com") || video.src.includes("vimeo.com")) {
        // 嵌入式视频
        parts.push(
          `      <div class="video-embed">`,
          `        <iframe src="${this.escapeHTML(video.src)}" allowfullscreen></iframe>`,
          video.caption ? `        <p>${this.escapeHTML(video.caption)}</p>` : "",
          `      </div>`
        );
      } else {
        // 原生视频
        parts.push(
          `      <video controls${video.poster ? ` poster="${this.escapeHTML(video.poster)}"` : ""}>`,
          `        <source src="${this.escapeHTML(video.src)}">`,
          `      </video>`,
          video.caption ? `      <p>${this.escapeHTML(video.caption)}</p>` : ""
        );
      }
    });
    
    parts.push(`    </section>`);
    
    return parts.filter((line) => line).join("\n");
  }
  
  /**
   * 包装完整的 HTML 文档
   */
  private wrapHTML(ir: IR, jsonLD: string, bodyHTML: string): string {
    return `<!DOCTYPE html>
<html lang="${ir.metadata.lang || "zh-CN"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(ir.metadata.title)}</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="${this.escapeHTML(ir.metadata.excerpt)}">
  ${ir.metadata.author ? `<meta name="author" content="${this.escapeHTML(ir.metadata.author)}">` : ""}
  ${ir.semantic.keywords ? `<meta name="keywords" content="${this.escapeHTML(ir.semantic.keywords.join(", "))}">` : ""}
  
  <!-- Open Graph -->
  <meta property="og:title" content="${this.escapeHTML(ir.metadata.title)}">
  <meta property="og:description" content="${this.escapeHTML(ir.metadata.excerpt)}">
  <meta property="og:url" content="${ir.metadata.url}">
  ${ir.content.images[0] ? `<meta property="og:image" content="${ir.content.images[0].src}">` : ""}
  
  <!-- JSON-LD 结构化数据 -->
  <script type="application/ld+json">
${jsonLD}
  </script>
  
  <!-- 基础样式 - 保持简洁 -->
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    header { margin-bottom: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 1rem; }
    .excerpt { font-size: 1.1rem; color: #555; font-style: italic; }
    section { margin: 2rem 0; }
    img { max-width: 100%; height: auto; }
    figure { margin: 1.5rem 0; }
    figcaption { color: #666; font-size: 0.9rem; margin-top: 0.5rem; }
    .video-embed { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; }
    .video-embed iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <article itemscope itemtype="https://schema.org/${ir.semantic.mainEntityType}">
    <!-- 隐藏的元数据 -->
    <meta itemprop="url" content="${ir.metadata.url}">
    ${ir.metadata.siteName ? `<meta itemprop="publisher" content="${this.escapeHTML(ir.metadata.siteName)}">` : ""}
    
${bodyHTML}
  </article>
  
  <!-- AI 访问标识 -->
  <meta name="generator" content="GEO Optimizer v1.0">
  <meta name="robots" content="index, follow">
</body>
</html>`;
  }
  
  /**
   * HTML 转义
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

/**
 * 导出单例
 */
export const geoGenerator = new GeoGenerator();
