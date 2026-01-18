"use client";

import { User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { BrowserMockup } from "./BrowserMockup";

interface StandardViewCardProps {
  url: string;
  mockHTML: string; // 真实的原始 HTML
}

export function StandardViewCard({ url, mockHTML }: StandardViewCardProps) {
  // 如果 HTML 太长，截断显示（可选）
  const displayHTML =
    mockHTML.length > 10000
      ? mockHTML.slice(0, 10000) + "\n\n<!-- ... 内容过长，已截断 ... -->"
      : mockHTML;

  return (
    <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-gray-200 dark:border-gray-700 shadow-card overflow-hidden flex flex-col h-full">
      {/* 卡片头部 */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded text-gray-600 dark:text-gray-300">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              普通访问者看到的
            </h3>
            <p className="text-xs text-gray-500">适合人类阅读（丰富内容）</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
          HTML + CSS
        </span>
      </div>

      {/* 切换标签 */}
      <Tabs defaultValue="code" className="flex-1 flex flex-col">
        <TabsList className="m-4 mb-0">
          <TabsTrigger value="code" className="cursor-pointer">
            HTML 代码
          </TabsTrigger>
          <TabsTrigger value="preview" className="cursor-pointer">
            实际样式
          </TabsTrigger>
        </TabsList>

        {/* HTML 代码视图 */}
        <TabsContent value="code" className="flex-1 m-0">
          <div className="p-5 flex-1 bg-gray-100/50 dark:bg-[#0f1923]">
            <BrowserMockup>
              <div className="bg-[#1e1e1e] h-[360px] overflow-auto custom-scrollbar">
                <SyntaxHighlighter
                  language="html"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    background: "transparent",
                    fontSize: "0.75rem",
                  }}
                  showLineNumbers
                >
                  {displayHTML}
                </SyntaxHighlighter>
              </div>
            </BrowserMockup>

            {/* 如果 HTML 被截断，显示提示 */}
            {mockHTML.length > 10000 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 mt-3 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  ℹ️ 原始 HTML 共 {mockHTML.length.toLocaleString()}{" "}
                  字符，已显示前 10,000 字符
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 实际样式预览 */}
        <TabsContent value="preview" className="flex-1 m-0">
          <div className="p-5 flex-1 bg-gray-100/50 dark:bg-[#0f1923]">
            <BrowserMockup>
              <iframe
                src={url || "https://example.com"}
                className="w-full h-[360px]"
                title="原始页面预览"
                sandbox="allow-scripts allow-same-origin"
              />
            </BrowserMockup>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 mt-3 rounded border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                ⚠️ 某些网站可能不允许 iframe 嵌入，
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  点击跳转
                </a>
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 底部说明 */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30">
        <div className="flex items-center justify-between text-xs">
          <p className="text-gray-500">
            丰富的视觉设计和 CSS，专为人类消费设计
          </p>
          {mockHTML && (
            <p className="text-gray-400 font-mono">
              {(mockHTML.length / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
