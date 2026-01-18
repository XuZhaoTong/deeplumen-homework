"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { AnalysisResults } from "@/components/AnalysisResults";
import { Footer } from "@/components/Footer";
import type { IR } from "@/lib/types";

export default function Home() {
  const [hasResults, setHasResults] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentIR, setCurrentIR] = useState<IR | null>(null);
  const [currentGeoHTML, setCurrentGeoHTML] = useState("");
  const [currentOriginalHTML, setCurrentOriginalHTML] = useState("");

  const handleAnalyze = (
    url: string,
    ir: IR,
    geoHTML: string,
    originalHTML?: string,
  ) => {
    setCurrentUrl(url);
    setCurrentIR(ir);
    setCurrentGeoHTML(geoHTML);
    setCurrentOriginalHTML(originalHTML || "");
    setHasResults(true);

    // 滚动到结果区域
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f7f8] dark:bg-[#0f1923]">
      <Header />

      <main className="flex-grow flex flex-col items-center w-full">
        <Hero onAnalyze={handleAnalyze} />

        {hasResults && currentIR && (
          <div
            id="results"
            className={"w-full flex items-center justify-center"}
          >
            <AnalysisResults
              url={currentUrl}
              originalHTML={currentOriginalHTML}
              geoHTML={currentGeoHTML}
              iRData={currentIR}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
