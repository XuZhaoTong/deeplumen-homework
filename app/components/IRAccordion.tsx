"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import JsonView from "@uiw/react-json-view";

interface IRAccordionProps {
  data: any;
}

export function IRAccordion({ data }: IRAccordionProps) {
  return (
    <div className="mt-8">
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem
          value="item-1"
          className="bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
        >
          <AccordionTrigger className="px-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                查看中间数据结构 (IR)
              </span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-mono">
                JSON
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <div className="border-t border-gray-200 dark:border-gray-700 bg-[#f8fafc] dark:bg-[#0d1117]">
              <div className="p-4 overflow-x-auto">
                <JsonView
                  value={data}
                  collapsed={false}
                  displayDataTypes={false}
                  enableClipboard={false}
                  style={{
                    fontSize: "12px",
                    lineHeight: "1.5",
                    fontFamily: "monospace",
                  }}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
