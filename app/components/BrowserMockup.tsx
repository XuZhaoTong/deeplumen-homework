interface BrowserMockupProps {
  children: React.ReactNode;
  className?: string;
}

export function BrowserMockup({ children, className = "" }: BrowserMockupProps) {
  return (
    <div className={`bg-white dark:bg-[#1a2632] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* 浏览器顶部栏 - 红黄绿圆点 */}
      <div className="h-6 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center px-2 gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-400"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
        <div className="w-2 h-2 rounded-full bg-green-400"></div>
      </div>
      {/* 内容区域 */}
      {children}
    </div>
  );
}
