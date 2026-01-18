"use client";

import { useState } from "react";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";

interface HeroProps {
  onAnalyze: (
    url: string,
    ir: any,
    geoHTML: string,
    originalHTML?: string,
  ) => void;
}

export function Hero({ onAnalyze }: HeroProps) {
  const [url, setUrl] = useState("https://news.qq.com/rain/a/20260118A030DV00");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url) return;

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      setError("请输入有效的 URL");
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      // 调用解析 API
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "解析失败");
      }

      // 传递结果给父组件（包括原始 HTML）
      onAnalyze(url, data.ir, data.geoHTML, data.originalHTML);
    } catch (err) {
      console.error("解析错误:", err);
      setError(err instanceof Error ? err.message : "解析失败，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="w-full max-w-[960px] px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 flex flex-col items-center text-center">
      {/* 主标题 - 单行显示且加粗 */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]">
        为{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007ef5] to-blue-400">
          AI 搜索
        </span>{" "}
        优化
      </h1>

      {/* 副标题 */}
      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed">
        将标准网页转换为结构化、机器可读的格式，针对 LLM
        和生成式搜索引擎（GEO）进行优化。
      </p>

      {/* 输入框 */}
      <div className="w-full max-w-[560px] relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-[#007ef5]/30 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-white dark:bg-[#1a2632] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-soft">
          <div className="pl-3 pr-2 text-gray-400">
            <ExternalLink className="w-5 h-5" />
          </div>
          <input
            className="flex-1 bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 text-base py-3 outline-none"
            placeholder="https://example.com/article"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isAnalyzing) {
                handleAnalyze();
              }
            }}
            disabled={isAnalyzing}
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !url}
            className="bg-[#007ef5] hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>解析中...</span>
              </>
            ) : (
              <>
                <span>开始分析</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 max-w-[560px] w-full">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">❌ {error}</p>
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="mt-8 text-xs text-gray-500">
        <p>支持任何 HTML 网页，如新闻文章、博客、产品页面等</p>
      </div>
    </section>
  );
}
