// app/api/geo/[slug]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { htmlCleaner } from "@/lib/cleaner";
import { irGenerator } from "@/lib/ir-generator";
import { geoGenerator } from "@/lib/geo-generator";
import { aiDetector } from "@/lib/ai-detector";
import { getCachedIR } from "@/lib/cache";

/**
 * GET /api/geo/[slug]
 *
 * GEO 页面访问入口（优化版）
 *
 * 改进：
 * 1. 使用缓存加速响应
 * 2. 使用优化后的 AI 检测器
 * 3. 提供更详细的检测信息（开发模式）
 *
 * 功能：
 * 1. 检测访问者是否为 AI/Bot
 * 2. AI 访问 → 返回 GEO 优化的 HTML
 * 3. 普通访问 → 返回提示页面
 *
 * 使用方式：
 * - /api/geo/example.com/article  → 访问 example.com/article 的 GEO 版本
 * - /api/geo?url=https://example.com/article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const startTime = Date.now();

  try {
    const { slug } = await params;
    // 1. 获取目标 URL
    const targetURL = getTargetURL(request, slug);

    if (!targetURL) {
      return NextResponse.json(
        {
          error: "缺少目标 URL",
          usage: "访问 /api/geo/[domain]/[path] 或使用 ?url= 参数",
        },
        { status: 400 },
      );
    }

    // 2. 检测是否为 AI 访问
    const isAIRequest = aiDetector.isAI(request);
    const detectionDetails = aiDetector.getDetectionDetails(request);

    console.log(`[GEO] 访问请求: ${targetURL}`);
    console.log(`[GEO] AI 检测: ${isAIRequest}`);
    console.log(`[GEO] 检测详情:`, detectionDetails);

    // 3. 如果是普通访问，返回提示页面
    if (!isAIRequest) {
      return createHumanAccessPage(targetURL, detectionDetails, request);
    }

    // 4. AI 访问：生成并返回 GEO HTML
    console.log(`[GEO] 为 AI 生成页面...`);

    // 使用缓存获取 IR
    let cached = false;
    const ir = await getCachedIR(targetURL, async () => {
      console.log(`[GEO] 缓存未命中，开始解析...`);

      // Step 1: 清洗 HTML
      const cleanedArticle = await htmlCleaner.clean(targetURL);

      if (!htmlCleaner.validateArticle(cleanedArticle)) {
        throw new Error("页面内容不足或无法解析");
      }

      // Step 2: 生成 IR
      return irGenerator.generate(cleanedArticle, targetURL);
    });

    cached = true; // 简化判断，实际可以通过检查是否执行了 factory 来判断

    // Step 3: 生成 GEO HTML
    const geoHTML = geoGenerator.generate(ir);

    const processingTime = Date.now() - startTime;
    console.log(
      `[GEO] 成功生成 GEO 页面，耗时: ${processingTime}ms，缓存: ${cached ? "可能" : "否"}`,
    );

    // 返回 GEO HTML
    return new NextResponse(geoHTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // 添加自定义头标识这是 GEO 页面
        "X-GEO-Optimized": "true",
        "X-Original-URL": targetURL,
        "X-Processing-Time": `${processingTime}ms`,
        // AI 服务类型（如果可识别）
        "X-AI-Service": aiDetector.getAIServiceType(request) || "unknown",
        // 缓存控制
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[GEO] 错误:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成 GEO 页面失败",
      },
      { status: 500 },
    );
  }
}

/**
 * 从请求中获取目标 URL
 */
function getTargetURL(request: NextRequest, slug: string): string | null {
  // 方式 1: 从 query 参数获取
  const urlParam = request.nextUrl.searchParams.get("url");
  if (urlParam) {
    return urlParam;
  }

  // 方式 2: 从路径重建 URL
  // /api/geo/example.com/article → https://example.com/article
  if (slug) {
    // slug 可能是 "example.com" 或 "example.com/article/123"
    const parts = slug.split("/");
    const domain = parts[0];
    const path = parts.slice(1).join("/");

    // 简单判断是否有协议
    if (domain.includes("http")) {
      return slug;
    }

    // 默认 https
    return `https://${domain}${path ? "/" + path : ""}`;
  }

  return null;
}

/**
 * 创建人类访问提示页面
 */
function createHumanAccessPage(
  targetURL: string,
  detectionDetails: ReturnType<typeof aiDetector.getDetectionDetails>,
  request: NextRequest,
): NextResponse {
  const isDev = process.env.NODE_ENV === "development";

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GEO 页面访问</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f7f8;
      color: #333;
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 16px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
    }
    .icon {
      font-size: 4rem;
      text-align: center;
      margin-bottom: 1.5rem;
    }
    h1 {
      text-align: center;
      color: #007ef5;
      font-size: 1.8rem;
      margin-bottom: 1rem;
    }
    .subtitle {
      text-align: center;
      color: #666;
      font-size: 1rem;
      margin-bottom: 2rem;
    }
    .info-box {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid #007ef5;
      margin: 1.5rem 0;
    }
    .info-box p {
      margin: 0.5rem 0;
    }
    .link {
      color: #007ef5;
      text-decoration: none;
      font-weight: 500;
    }
    .link:hover {
      text-decoration: underline;
    }
    hr {
      margin: 2rem 0;
      border: none;
      border-top: 1px solid #e2e8f0;
    }
    details {
      margin-top: 2rem;
      background: #fafbfc;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
      color: #007ef5;
      user-select: none;
    }
    summary:hover {
      color: #0056b3;
    }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .debug-info {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-size: 0.9rem;
    }
    .debug-info h3 {
      margin-top: 0;
      color: #856404;
    }
    .tag {
      display: inline-block;
      background: #e2e8f0;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      margin: 0.25rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🤖</div>
    <h1>这是一个 GEO 优化页面</h1>
    <p class="subtitle">此页面专为 AI/LLM 访问优化</p>
    
    <div class="info-box">
      <p><strong>原始页面:</strong></p>
      <p><a href="${targetURL}" class="link" target="_blank" rel="noopener">${targetURL}</a></p>
    </div>
    
    <p style="text-align: center; color: #666;">
      如果您是人类访问者，请访问上面的原始页面链接。
    </p>
    
    <hr>
    
    <details>
      <summary>我是开发者，如何测试 AI 访问？</summary>
      <p style="margin-top: 1rem;">您可以通过以下方式模拟 AI 访问：</p>
      
      <h4>方式 1: 使用 User-Agent</h4>
      <pre>curl "${request.url}" \\
  -H "User-Agent: GPTBot"</pre>
      
      <h4>方式 2: 使用 Query 参数</h4>
      <pre>curl "${request.url}?ai=true"</pre>
      
      <h4>方式 3: 使用自定义 Header</h4>
      <pre>curl "${request.url}" \\
  -H "X-AI-Request: true"</pre>
      
      <h4>支持的 AI User-Agents</h4>
      <div style="margin-top: 0.5rem;">
        <span class="tag">GPTBot</span>
        <span class="tag">ChatGPT-User</span>
        <span class="tag">Claude-Web</span>
        <span class="tag">Google-Extended</span>
        <span class="tag">PerplexityBot</span>
        <span class="tag">Applebot-Extended</span>
      </div>
    </details>
    
    ${
      isDev
        ? `
    <div class="debug-info">
      <h3>🔍 检测详情（开发模式）</h3>
      <p><strong>检测结果:</strong> ${detectionDetails.isAI ? "✅ AI" : "❌ 非 AI"}</p>
      <p><strong>置信度:</strong> ${detectionDetails.confidence}</p>
      <p><strong>User-Agent:</strong> <code style="font-size: 0.8rem;">${detectionDetails.userAgent}</code></p>
      <p><strong>Accept:</strong> <code style="font-size: 0.8rem;">${detectionDetails.accept}</code></p>
      <p><strong>检测原因:</strong></p>
      <ul style="margin: 0.5rem 0;">
        ${detectionDetails.reasons.map((r) => `<li>${r}</li>`).join("")}
      </ul>
    </div>
    `
        : ""
    }
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

/**
 * POST 方法 - 支持提交 URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const body = await request.json();
  const { url } = body;

  if (url) {
    // 创建新请求，添加 url 参数
    const newURL = new URL(request.url);
    newURL.searchParams.set("url", url);

    return GET(
      new NextRequest(newURL.toString(), {
        headers: request.headers,
      }),
      { params },
    );
  }

  return NextResponse.json(
    {
      error: "缺少 url 参数",
    },
    { status: 400 },
  );
}
