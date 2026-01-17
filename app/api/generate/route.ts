// app/api/generate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { geoGenerator } from "@/lib/geo-generator";
import type { IR } from "@/lib/types";

/**
 * POST /api/generate
 *
 * 根据提供的 IR 生成 GEO HTML
 *
 * 这个 API 允许前端缓存 IR，然后按需生成不同格式的输出
 *
 * Request Body:
 * {
 *   "ir": { ... }  // IR 对象
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "geoHTML": "<!DOCTYPE html>..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ir } = body as { ir: IR };

    // 验证 IR
    if (!ir || !ir.metadata || !ir.content || !ir.semantic) {
      return NextResponse.json(
        {
          success: false,
          error: "无效的 IR 数据结构",
        },
        { status: 400 },
      );
    }

    // 生成 GEO HTML
    console.log(`[Generate] 为 "${ir.metadata.title}" 生成 GEO HTML`);
    const geoHTML = geoGenerator.generate(ir);

    return NextResponse.json({
      success: true,
      geoHTML,
    });
  } catch (error) {
    console.error("[Generate] 错误:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 500 },
    );
  }
}
