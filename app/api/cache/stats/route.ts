// app/api/cache/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAllCacheStats, clearAllCaches } from "@/lib/cache";

/**
 * GET /api/cache/stats
 *
 * 获取缓存统计信息
 *
 * 返回：
 * {
 *   "ir": {
 *     "hits": 100,
 *     "misses": 20,
 *     "size": 50,
 *     "hitRate": 0.83
 *   },
 *   "html": { ... }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getAllCacheStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取统计失败",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/cache/stats
 *
 * 清空所有缓存
 */
export async function DELETE(request: NextRequest) {
  try {
    clearAllCaches();

    return NextResponse.json({
      success: true,
      message: "缓存已清空",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "清空缓存失败",
      },
      { status: 500 },
    );
  }
}
