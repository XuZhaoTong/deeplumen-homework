"use client";

import { Bot } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { BrowserMockup } from "./BrowserMockup";

interface AIViewCardProps {
  mockGeoHTML: string;
}

export function AIViewCard({ mockGeoHTML }: AIViewCardProps) {
  return (
    <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-[#007ef5]/20 shadow-[0_0_0_1px_rgba(0,126,245,0.1),0_4px_20px_rgba(0,126,245,0.05)] overflow-hidden flex flex-col h-full">
      {/* 装饰性渐变条 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#007ef5] via-blue-400 to-[#007ef5]"></div>

      {/* 卡片头部 */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#007ef5]/10 p-1 rounded text-[#007ef5]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              AI 看到的
            </h3>
            <p className="text-xs text-[#007ef5]">适合 AI 阅读（结构化）</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-[#007ef5]/10 text-[#007ef5] px-2 py-1 rounded">
          JSON-LD + Semantic
        </span>
      </div>

      {/* 切换标签 */}
      <Tabs defaultValue="code" className="flex-1 flex flex-col">
        <TabsList className="m-4 mb-0">
          <TabsTrigger value="code" className="cursor-pointer">
            HTML 代码
          </TabsTrigger>
          <TabsTrigger value="rendered" className="cursor-pointer">
            渲染效果
          </TabsTrigger>
        </TabsList>

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
                  {mockGeoHTML}
                </SyntaxHighlighter>
              </div>
            </BrowserMockup>
          </div>
        </TabsContent>

        <TabsContent value="rendered" className="flex-1 m-0">
          <div className="p-5 flex-1 bg-gray-100/50 dark:bg-[#0f1923]">
            <BrowserMockup>
              <iframe
                srcDoc={mockGeoHTML}
                className="w-full h-[360px] border-0 bg-white"
                title="GEO HTML 预览"
                sandbox="allow-same-origin"
              />
            </BrowserMockup>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-gray-500 p-4 pt-2 border-t border-gray-100 dark:border-gray-700 text-center">
        结构化语义标记，便于 AI 理解和处理
      </p>
    </div>
  );
}
