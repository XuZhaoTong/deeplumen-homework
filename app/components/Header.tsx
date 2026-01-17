"use client";

import { Box } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-[#0f1923]/80 border-b border-[#f0f2f5] dark:border-gray-800">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-gradient-to-br from-[#007ef5] to-blue-600 flex items-center justify-center text-white shadow-glow">
              <Box className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold leading-none tracking-tight">
                GEO 优化器
              </h1>
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                Generative Engine Optimization
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
