// app/api/source-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const range = request.headers.get("range");
    const headers: HeadersInit = {
      "User-Agent": "Mozilla/5.0",
    };

    // 支持 Range 请求（视频/音频需要）
    if (range) {
      headers["Range"] = range;
    }

    const response = await fetch(url, { headers });
    const buffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    const responseHeaders: HeadersInit = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    // 传递 Range 相关的响应头
    if (response.headers.get("content-range")) {
      responseHeaders["Content-Range"] = response.headers.get("content-range")!;
      responseHeaders["Accept-Ranges"] = "bytes";
    }

    return new NextResponse(buffer, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
