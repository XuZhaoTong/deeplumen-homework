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
 *   "originalHTML": "<!DOCTYPE html>...",
 *   "originalTitle": "文章标题"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
        { status: 400 },
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
        { status: 400 },
      );
    }

    // 2. 开始解析
    console.log(`[Parse] 开始处理: ${url}`);

    // Step 1: 清洗 HTML
    const cleanedArticle = await htmlCleaner.clean(url);

    if (!htmlCleaner.validateArticle(cleanedArticle)) {
      throw new Error("页面内容不足或无法解析");
    }

    console.log(`[Parse] 清洗成功: ${cleanedArticle.title}`);

    // 保存原始 HTML（用于展示）
    const originalHTML = cleanedArticle.originalHTML || "";

    // Step 2: 生成 IR
    const ir = irGenerator.generate(cleanedArticle, url);
    console.log(
      `[Parse] IR 生成成功, 包含 ${ir.content.paragraphs.length} 个段落`,
    );

    // 3. 生成 GEO HTML
    console.log(`[Parse] 生成 GEO HTML...`);
    const geoHTML = geoGenerator.generate(ir);
    console.log(`[Parse] GEO HTML 生成成功`);

    const processingTime = Date.now() - startTime;
    console.log(`[Parse] 处理完成，耗时: ${processingTime}ms`);

    // 4. 返回结果
    const response: ParseResponse & {
      processingTime: number;
    } = {
      success: true,
      ir,
      geoHTML,
      originalHTML: originalHTML || undefined,
      originalTitle: ir.metadata.title,
      processingTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Parse] 错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "解析失败",
      } as ParseResponse,
      { status: 500 },
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
      { status: 400 },
    );
  }

  // 转发到 POST 处理
  return POST(
    new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ url }),
    }),
  );
}
