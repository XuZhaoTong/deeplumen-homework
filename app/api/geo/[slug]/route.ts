// app/api/geo/[slug]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { htmlCleaner } from "@/lib/cleaner";
import { irGenerator } from "@/lib/ir-generator";
import { geoGenerator } from "@/lib/geo-generator";
import { aiDetector } from "@/lib/ai-detector";

/**
 * GET /api/geo/[slug]
 * 
 * GEO 页面访问入口
 * 
 * 功能：
 * 1. 检测访问者是否为 AI/Bot
 * 2. AI 访问 → 返回 GEO 优化的 HTML
 * 3. 普通访问 → 重定向到原始页面或返回提示
 * 
 * 使用方式：
 * - /api/geo/example.com/article  → 访问 example.com/article 的 GEO 版本
 * - 或者在 URL 中传参: /api/geo?url=https://example.com/article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // 1. 获取目标 URL
    const targetURL = getTargetURL(request, params.slug);
    
    if (!targetURL) {
      return NextResponse.json(
        {
          error: "缺少目标 URL",
          usage: "访问 /api/geo/[domain]/[path] 或使用 ?url= 参数",
        },
        { status: 400 }
      );
    }
    
    // 2. 检测是否为 AI 访问
    const isAIRequest = aiDetector.isAI(request);
    
    console.log(`[GEO] 访问请求: ${targetURL}`);
    console.log(`[GEO] AI 检测: ${isAIRequest}`);
    
    // 3. 如果是普通访问，重定向或返回提示
    if (!isAIRequest) {
      // 可以选择重定向到原始页面
      // return NextResponse.redirect(targetURL);
      
      // 或者返回一个友好的提示页面
      return new NextResponse(
        `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>GEO 页面访问</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
    }
    .box {
      background: #f5f7f8;
      padding: 2rem;
      border-radius: 12px;
    }
    a {
      color: #007ef5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>🤖 这是一个 GEO 优化页面</h1>
    <p>此页面专为 AI/Bot 访问优化</p>
    <p>普通访问请前往: <a href="${targetURL}">${targetURL}</a></p>
    <hr style="margin: 2rem 0;">
    <p style="font-size: 0.9rem; color: #666;">
      如果你是 AI，请在请求中添加以下任一标识：<br>
      • User-Agent 包含 "bot", "crawler", "GPTBot" 等<br>
      • URL 参数: ?ai=true<br>
      • Header: X-AI-Request: true
    </p>
  </div>
</body>
</html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        }
      );
    }
    
    // 4. AI 访问：生成并返回 GEO HTML
    console.log(`[GEO] 为 AI 生成页面...`);
    
    // Step 1: 清洗 HTML
    const cleanedArticle = await htmlCleaner.clean(targetURL);
    
    if (!htmlCleaner.validateArticle(cleanedArticle)) {
      throw new Error("页面内容不足或无法解析");
    }
    
    // Step 2: 生成 IR
    const ir = irGenerator.generate(cleanedArticle, targetURL);
    
    // Step 3: 生成 GEO HTML
    const geoHTML = geoGenerator.generate(ir);
    
    console.log(`[GEO] 成功生成 GEO 页面`);
    
    // 返回 GEO HTML
    return new NextResponse(geoHTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // 添加自定义头标识这是 GEO 页面
        "X-GEO-Optimized": "true",
        "X-Original-URL": targetURL,
        // 缓存控制（可选）
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[GEO] 错误:", error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成 GEO 页面失败",
      },
      { status: 500 }
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
 * POST 方法 - 支持提交 URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
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
      { params }
    );
  }
  
  return NextResponse.json(
    {
      error: "缺少 url 参数",
    },
    { status: 400 }
  );
}
