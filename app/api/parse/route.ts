// app/api/parse/route.ts

import { NextRequest, NextResponse } from "next/server";
import { htmlCleaner } from "@/lib/cleaner";
import { irGenerator } from "@/lib/ir-generator";
import { geoGenerator } from "@/lib/geo-generator";
import type { ParseResponse } from "@/lib/types";

/**
 * POST /api/parse
 * 
 * 解析指定 URL，返回 IR 和 GEO HTML
 * 
 * Request Body:
 * {
 *   "url": "https://example.com/article"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "ir": { ... },
 *   "geoHTML": "<!DOCTYPE html>...",
 *   "originalTitle": "文章标题"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await request.json();
    const { url } = body;
    
    // 验证 URL
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "缺少 URL 参数",
        } as ParseResponse,
        { status: 400 }
      );
    }
    
    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "URL 格式无效",
        } as ParseResponse,
        { status: 400 }
      );
    }
    
    // 2. 清洗 HTML（Step 1）
    console.log(`[Parse] 开始清洗: ${url}`);
    const cleanedArticle = await htmlCleaner.clean(url);
    
    if (!htmlCleaner.validateArticle(cleanedArticle)) {
      return NextResponse.json(
        {
          success: false,
          error: "页面内容不足或无法解析",
        } as ParseResponse,
        { status: 422 }
      );
    }
    
    console.log(`[Parse] 清洗成功: ${cleanedArticle.title}`);
    
    // 3. 生成 IR（Step 2）
    console.log(`[Parse] 生成 IR...`);
    const ir = irGenerator.generate(cleanedArticle, url);
    console.log(`[Parse] IR 生成成功, 包含 ${ir.content.paragraphs.length} 个段落`);
    
    // 4. 生成 GEO HTML（Step 3）
    console.log(`[Parse] 生成 GEO HTML...`);
    const geoHTML = geoGenerator.generate(ir);
    console.log(`[Parse] GEO HTML 生成成功`);
    
    // 5. 返回结果（包含原始 HTML）
    const response: ParseResponse = {
      success: true,
      ir,
      geoHTML,
      originalHTML: cleanedArticle.originalHTML, // 原始 HTML
      originalTitle: cleanedArticle.title,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Parse] 错误:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "解析失败",
      } as ParseResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/parse?url=xxx
 * 
 * 也支持 GET 请求（方便测试）
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  
  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: "缺少 url 参数",
      } as ParseResponse,
      { status: 400 }
    );
  }
  
  // 转发到 POST 处理
  return POST(
    new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ url }),
    })
  );
}
