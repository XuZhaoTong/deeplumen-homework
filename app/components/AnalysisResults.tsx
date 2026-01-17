"use client";

import { StandardViewCard } from "./StandardViewCard";
import { AIViewCard } from "./AIViewCard";
import { IRAccordion } from "./IRAccordion";

interface AnalysisResultsProps {
  url: string;
  mockOriginalHTML: string;
  mockGeoHTML: string;
  mockIRData: any;
}

export function AnalysisResults({
  url,
  mockOriginalHTML,
  mockGeoHTML,
  mockIRData,
}: AnalysisResultsProps) {
  return (
    <section className="w-full max-w-[1200px] px-4 pb-20">
      {/* 标题 - 带蓝色竖条 */}
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-[#007ef5] rounded-full"></span>
          优化分析
        </h2>
      </div>

      {/* 两个卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 卡片 1: 普通访问者看到的 */}
        <StandardViewCard url={url} mockHTML={mockOriginalHTML} />

        {/* 卡片 2: AI 看到的 */}
        <AIViewCard mockGeoHTML={mockGeoHTML} />
      </div>

      {/* IR 折叠面板 */}
      <IRAccordion data={mockIRData} />
    </section>
  );
}
