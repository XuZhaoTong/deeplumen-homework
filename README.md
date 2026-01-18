# deeplumen-homework

## 在线演示

[在线演示](https://deeplumen-homework.vercel.app)

## 快速开始

### 环境要求

- Node.js >= 22
- pnpm >= 10

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/XuZhaoTong/deeplumen-homework
cd deeplumen-homework

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问应用
open http://localhost:3000
```
---

## 目录

- [项目目标](#项目目标)
- [系统架构简述](#系统架构简述)
- [AI 访问识别逻辑](#AI访问识别逻辑)
- [GEO 页面设计原则](#GEO页面设计原则)
- [如何扩展](#如何扩展)
- [技术选型](#技术选型)
- [思考题](#思考题)

---

## 项目目标

随着 LLM（大语言模型）驱动的搜索引擎和智能体的兴起，网站不仅需要为人类用户优化，也需要为 AI/Agent/Bot 提供：
- 更易理解的结构化内容
- 可直接引用的事实、数据与多媒体信息
- 稳定、低噪音、可机器解析的页面形态
这种面向生成式引擎的优化，称为 **GEO (Generative Engine Optimization)**。

**本项目实现了一个完整的 GEO 优化处理流程**，能够：
1. 自动清洗网页噪音（广告、导航等）
2. 提取核心内容并生成结构化数据
3. 根据访问者类型返回不同形态的页面

---

## 系统架构简述
```
┌─────────────────────────────────────────────────────────────┐
│                         用户输入 URL                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Cache Layer          │
            │   - 内存缓存             │
            │   - TTL: 1小时          │
            └────────┬───────────────┘
                     │ Cache Miss
                     ▼
            ┌────────────────────────┐
            │   HTML Cleaner         │
            │   - Fetch HTML         │
            │   - Mozilla Readability│
            │   - 去除噪音            │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │   IR Generator         │
            │   - 解析 DOM           │
            │   - 提取内容元素        │
            │   - 识别语义信息        │
            │   - 生成关键词          │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │   GEO Generator        │
            │   - 生成 JSON-LD       │
            │   - Schema.org 标记    │
            │   - 简化样式            │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │   AI Detector          │
            │   - 检测访问者类型      │
            └────────┬───────────────┘
                     │
         ┌───────────┴────────────┐
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│  GEO HTML       │      │  提示页面/重定向 │
│  (AI 访问)      │      │  (普通访问)      │
└─────────────────┘      └─────────────────┘
```

### 核心模块说明

| 模块 | 职责 | 输入 | 输出 |
|------|------|------|------|
| **HTMLCleaner** | 获取并清洗 HTML | URL | ParsedArticle |
| **IRGenerator** | 生成中间表示 | ParsedArticle | IR |
| **GeoGenerator** | 生成 GEO HTML | IR | GEO HTML |
| **AIDetector** | 识别访问者类型 | Request | boolean |
| **Cache** | 缓存管理 | URL | IR (cached) |

---

## AI访问识别逻辑

通过多种方式识别 AI/Bot 访问：

### 1. User-Agent 检测

支持的 AI User-Agent：

| AI/服务 | User-Agent 关键词 |
|---|---|
| OpenAI ChatGPT | `ChatGPT-User`, `GPTBot`, `OAI-SearchBot` |
| Anthropic Claude | `Claude-Web`, `anthropic-ai`, `ClaudeBot`, `Claude-User` |
| Google Gemini | `Google-Extended`, `Gemini`, `GoogleOther`, `Google-CloudVertexBot` |
| Perplexity | `PerplexityBot`, `Perplexity-User` |
| You.com | `YouBot` |
| Apple Intelligence | `Applebot-Extended`, `Applebot` |
| Microsoft Bing | `BingBot` |
| Meta AI | `meta-externalagent`, `meta-externalfetcher`, `FacebookBot`, `facebookexternalhit` |
| Amazon | `Amazonbot` |
| ByteDance | `Bytespider` |
| Common Crawl | `CCBot` |
| Cohere | `cohere-ai` |
| Diffbot | `Diffbot` |
| LinkedIn | `LinkedInBot` |
| ImagesiftBot | `ImagesiftBot` |
**示例：**

```bash
curl http://localhost:3000/api/geo/example.com \
  -H "User-Agent: Mozilla/5.0 (compatible; GPTBot/1.0)"
```

### 2. 自定义 Header

```bash
curl http://localhost:3000/api/geo/example.com \
  -H "X-AI-Request: true"
```

或

```bash
curl http://localhost:3000/api/geo/example.com \
  -H "X-Bot-Type: llm"
```

### 3. Query 参数

```bash
curl "http://localhost:3000/api/geo/example.com?ai=true"
```

或

```bash
curl "http://localhost:3000/api/geo/example.com?format=geo"
```

### 检测策略

- ✅ **精准匹配**：只识别明确的 AI User-Agent
- ✅ **组合判断**：支持多种检测方式
- ✅ **可配置**：可通过配置文件调整策略

---

## GEO页面设计原则

### 1. 语义化标记

**JSON-LD 结构化数据：**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章标题",
  "author": {
    "@type": "Person",
    "name": "作者名"
  },
  "datePublished": "2024-01-01",
  "image": {
    "@type": "ImageObject",
    "url": "https://example.com/image.jpg"
  },
  "keywords": "关键词1, 关键词2"
}
</script>
```

**Schema.org itemprop 属性：**

```html
<article itemscope itemtype="https://schema.org/Article">
  <h1 itemprop="headline">文章标题</h1>
  <span itemprop="author" itemscope itemtype="https://schema.org/Person">
    <meta itemprop="name" content="作者名">
  </span>
  <div itemprop="articleBody">
    <p>文章内容...</p>
  </div>
</article>
```

### 2. 去除冗余

**移除的内容：**
- ❌ 广告脚本和追踪代码
- ❌ 复杂的 CSS 动画和过渡
- ❌ JavaScript 交互逻辑
- ❌ 社交分享按钮
- ❌ 评论区和推荐内容
- ❌ 导航菜单和侧边栏

**保留的内容：**
- ✅ 核心文本内容
- ✅ 标题层次结构
- ✅ 图片和视频（含元数据）
- ✅ 列表和表格
- ✅ 最小化的可读样式

### 3. 信息密度优化

| 指标 | 原始页面 | GEO 页面 | 改进 |
|------|---------|---------|------|
| HTML 大小 | ~200KB | ~30KB | **-85%** |
| 图片请求 | 50+ | 保留核心图片 | **按需** |
| JavaScript | 多个文件 | 0 | **-100%** |
| CSS | 复杂样式 | 内联最小样式 | **-90%** |
| 信噪比 | 低 | 高 | **显著提升** |

### 4. 内容组织

```
原始页面结构：          GEO 页面结构：
┌────────────┐         ┌────────────┐
│ 导航菜单    │         │ 元数据      │
├────────────┤         ├────────────┤
│ 广告banner │         │ 标题        │
├────────────┤         ├────────────┤
│ 侧边栏      │         │ 摘要        │
│            │    →    ├────────────┤
│ 主要内容    │         │ 正文        │
│            │         │ (按主题组织) │
│ 相关推荐    │         ├────────────┤
├────────────┤         │ 图片/视频   │
│ 评论区      │         ├────────────┤
├────────────┤         │ 列表数据    │
│ 页脚        │         └────────────┘
└────────────┘
```

---

## 如何扩展

如果时间充裕，可以进一步优化：

### 1. 支持 SPA 页面

使用 Playwright 获取渲染后的 HTML

### 2. 批量处理 API

并发处理多个 url，返回所有结果

### 3. 封装成 Skill

给大模型使用

### 4. 封装成 Next.js SDK

使用 Next.js 大部分是为了SEO，安装此 SDK 后 GEO优化也会更佳

### 5. 封装成 SaaS服务
给大模型训练、搜索时使用

### 6. 性能优化
使用 Rust/Wasm 进行CPU密集型任务，提高性能
---

## 技术选型

### 核心技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|---------|
| **Next.js** | 16 | React 框架 | • App Router 支持<br>• 内置 API Routes<br>• SSR/SSG 能力<br>• TypeScript 原生支持 |
| **Mozilla Readability** | 0.6 | 内容提取 | • 成熟稳定<br>• Firefox 官方库<br>• 准确度高 |
| **Cheerio** | 1.1 | HTML 解析 | • 性能优秀<br>• 服务端友好 |
| **JSDOM** | 27 | DOM 模拟 | • Readability 依赖<br>• 完整的 DOM API |

### 为什么选择 Next.js？

**适合场景：**
- ✅ MVP 快速开发
- ✅ 中小规模应用
- ✅ 需要 UI 界面的工具

**不适合场景：**
- ❌ 高并发 API 服务（建议用 Go/Rust）
- ❌ 实时数据处理
- ❌ 复杂的后台任务

---

## 思考题

### 1. 如何支持 AI 搜索引擎主动抓取？
- 使用 robots.txt 类似的，AI搜索引擎专用配置文件
- 项目 GEO 友好，信噪比高，AI 搜索引擎会优先抓取

### 2. GEO 页面是否应该与原页面 1:1？

**答案：不应该 1:1 对应。**

**理由：**

| 维度 | 原页面 | GEO 页面 | 差异原因 |
|------|--------|---------|---------|
| **设计目标** | 人类视觉消费 | AI 机器理解 | 阅读方式不同 |
| **内容组织** | 按视觉布局 | 按语义主题 | AI 不需要视觉设计 |
| **信息密度** | 穿插广告、导航 | 只保留核心内容 | 提高信噪比 |
| **元数据** | 可能缺失 | 补充完整 | AI 需要结构化信息 |
| **表现形式** | CSS 样式丰富 | 最小化样式 | 减少解析成本 |

### 3. 如果页面是 SPA / 强交互，如何处理？

使用 Playwright 获取渲染后的 HTML

**优点：**
- ✅ 完全模拟真实浏览器
- ✅ 支持所有 JavaScript 框架
- ✅ 处理动态加载

**缺点：**
- ⚠️ 速度较慢（2-5秒）
- ⚠️ 内存消耗大
- ⚠️ 需要额外依赖


### 4. 如何避免 GEO 页面被滥用或误识别？
