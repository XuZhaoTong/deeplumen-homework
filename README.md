# 网页 GEO (Generative Engine Optimization) 自动化处理引擎

## 🌐 在线演示

[点击访问在线演示](https://deeplumen-homework.vercel.app)

[API文档](https://deeplumen-homework.vercel.app/api-docs)

---

## 📖 目录

- [项目背景与目标](#-项目背景与目标)
- [核心系统架构](#-核心系统架构)
- [AI 访问识别策略](#-ai-访问识别策略)
- [GEO 页面设计原则](#-geo-页面设计原则)
- [深度思考 (Deep Thinking)](#-深度思考-deep-thinking)
- [技术选型说明](#-技术选型说明)
- [未来扩展规划](#-未来扩展规划)

---

## 🚀 项目背景与目标

随着 LLM（大语言模型）驱动的搜索引擎（如 SearchGPT, Perplexity）逐渐取代传统检索，互联网的信息获取模式正从 **“检索 (Retrieval)”** 转向 **“合成 (Synthesis)”**。

本项目的核心目标是实现 **GEO (Generative Engine Optimization)** 流程，解决传统网页对 AI 不友好的痛点：
1.  **高噪音**：传统的 HTML 充斥着广告、导航、样式类名，消耗 LLM 的 Token 上下文窗口。
2.  **非结构化**：缺乏机器可读的语义实体关系。
3.  **解析困难**：复杂的 DOM 结构增加了 Agent 的抓取成本。

本项目实现了一个**双模态内容分发系统**：自动识别访问者身份，为人类提供视觉页面，为 AI Agent 提供高语义密度的结构化数据。

---

## 🏗 核心系统架构

本项目采用 **“解析 → 中间表示 (IR) → 生成”** 的三层架构设计，确保了数据处理的解耦与灵活性。

```text
+-----------------+
|   用户 / Agent  |
+--------+--------+
         |
         v
+--------+--------------------------+
|  Edge Gateway / AI Detector       |
|  (Next.js Middleware)             |
+--------+------------------+-------+
         |                  |
         | Human            | AI / Bot (GPTBot, Claude...)
         | (Browser)        |
         v                  v
+--------+--------+   +-----+---------------------------+
|                 |   |  GEO Processing Engine          |
|  原始 HTML 页面  |   |                                 |
|  (SSR / Client) |   |  [ HTML Cleaner ]               |
|                 |   |         | (Raw HTML)            |
+-----------------+   |         v                       |
                      |  [ DOM Parser ]                 |
                      |         | (Structured Data)     |
                      |         v                       |
                      |  [ IR Generator (中间表示层) ]    |
                      |         | (IR Object)           |
                      |         v                       |
                      |  [ GEO Generator ]              |
                      +---------+-----------------------+
                                |
                                | (JSON-LD + Semantic HTML)
                                v
                      +---------+-----------------------+
                      |    AI-Friendly Page Response    |
                      +---------------------------------+

```

### 核心模块职责

| 模块 | 对应文件 | 职责 |
| --- | --- | --- |
| **HTMLCleaner** | `lib/cleaner.ts` | 基于 Mozilla Readability 算法，去除广告、脚本、样式等噪音，提取核心正文。 |
| **IRGenerator** | `lib/ir-generator.ts` | **(核心抽象)** 将清洗后的数据标准化为 `IR` (Intermediate Representation) 对象，包含元数据、内容块、实体类型、阅读时长等。 |
| **GeoGenerator** | `lib/geo-generator.ts` | 消费 IR 数据，注入 `schema.org` (JSON-LD) 结构化数据，生成极简、语义化的 HTML。 |
| **AIDetector** | `lib/ai-detector.ts` | 多维度的 AI 流量指纹识别（UA、Header、Query）。 |

---

## 🤖 AI 访问识别策略

在 `lib/ai-detector.ts` 中实现了多层次的识别逻辑，支持配置 `strictMode`。

### 1. User-Agent 特征库匹配

支持主流 AI Bot 的精准识别，包括但不限于：

* **OpenAI**: `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`
* **Anthropic**: `ClaudeBot`, `Claude-Web`
* **Google**: `Google-Extended`, `Gemini`
* **Perplexity**: `PerplexityBot`
* **Other**: `Applebot-Extended`, `Bytespider` 等

### 2. 显式协议识别 (Header/Query)

允许通过 API 方式显式请求 GEO 页面，方便 Agent 主动调用，[在线测试](https://deeplumen-homework.vercel.app/api-docs#tag/geo/GET/api/geo/{slug})

* Header: `X-AI-Request: true`
* Query: `?ai=true` 或 `?format=geo`

---

## 🎨 GEO 页面设计原则

基于**“面向模型 (Model-First)”** 的设计理念，GEO 页面具备以下特征：

1. **最大化信噪比 (Signal-to-Noise Ratio)**：
* 移除所有 CSS、JS、广告 iframe。
* **数据对比**：原始页面 2MB -> GEO 页面 <50KB，**Token 消耗降低 90% 以上**。


2. **语义显性化**：
* 使用 `<article>`, `<section>`, `<figure>` 等语义标签替代 `<div>`。
* 图片强制保留 `alt` 和 `caption`，方便多模态模型理解。


3. **结构化数据优先**：
* 头部预埋完整的 `application/ld+json`，帮助 AI 建立知识图谱 (Knowledge Graph) 实体关联。



---

## 💡 深度思考 (Deep Thinking)

基于项目实践与对 AI 搜索基础设施的研究，以下是对关键问题的思考：

### Q1: 如果需要支持 AI 搜索引擎主动抓取，你会如何设计？

**答：引入 `llms.txt` 标准协议。**
除了被动等待 User-Agent 识别，我会在网站根目录部署 `/llms.txt`（类似 robots.txt，但服务于推理）。该文件通过 Markdown 格式声明网站的核心文档结构，为 AI 提供了明确的“站点地图”和“上下文入口”，变被动抓取为主动喂养。

### Q2: GEO 页面是否应该与原页面 1:1？

**答：绝对不应该。**

* **视觉 vs 逻辑**：原页面服务于人类的视觉流（Visual Flow），包含大量为了留存率设计的推荐位和交互动效。
* **Token 经济学**：AI 的推理成本与 Token 长度成正比。1:1 还原意味着保留大量对推理无效的 Token，这会增加延迟并引起模型的“注意力分散”。GEO 页面应是原页面的“逻辑摘要”和“事实集合”。

### Q3: 如果页面是 SPA / 强交互，你会如何处理？

**答：采用 Headless Browser 预渲染 (Prerendering)。**
当前的 `fetch` + `cheerio` 方案无法处理 CSR（客户端渲染）页面。对于 SPA，我会引入 **Playwright** 或 **Puppeteer** 作为中间件。

* **流程**：检测到 AI UA -> 启动 Headless Browser -> 等待 Hydration 完成 -> 获取完整 DOM -> 传入 HTMLCleaner。
* **优化**：由于浏览器实例开销大，必须配合 Redis 缓存层，对生成的 IR 结果进行持久化缓存。

### Q4: 如何避免 GEO 页面被滥用或误识别？

**答：IP 反查验证 (Reverse DNS Lookup) + 签名机制。**
仅靠 User-Agent 极易被伪造。生产环境应实施：

1. **IP 验证**：获取请求 IP，反查 DNS 指针是否指向 OpenAI/Google 的官方域名，并比对官方公布的 IP 白名单段。
2. **内容水印**：在 GEO 页面中嵌入不可见的零宽字符水印，用于追踪内容被非法模型训练的来源。
3. **速率限制**：针对 GEO 接口设置不同于普通用户的 Rate Limit，防止被用于低成本的数据清洗。

---

## 💻 技术选型说明

| 技术 | 用途 | 选择理由 |
| --- | --- | --- |
| **Next.js** | React 框架 | **业界首选的全栈框架，完美契合 MVP 阶段的快速交付。** 架构上支持 API 逻辑解耦，为未来将后端服务剥离至 Nest.js/FastAPI 等专业框架预留了平滑的演进路径。 |
| **Linkedom**  | 服务端 DOM 模拟 | **高性能的 JSDOM 替代方案。** 为 Mozilla Readability 提供轻量级的 Web 标准 DOM 环境，内存占用极低，显著提升清洗管线的吞吐量。 |
| **Cheerio** | 结构化内容提取 | **快速的 HTML 解析器。** 负责在后处理阶段从清洗后的 HTML 中精准提取 IR 数据（Heading/Image/List），语法简洁且性能远优于正则。 |
| **Mozilla Readability**  | 核心去噪算法 | **工业级去噪引擎。** 经过 Firefox 生产环境验证的算法，能智能剥离广告与导航，提取高信噪比的核心正文。 |

---

## 🔮 未来扩展规划

如果继续完善本项目，我将从以下维度进行扩展：

1. **核心性能重构 (Rust/Wasm)**： 将现有的 HTML 清洗与 IR 生成逻辑（CPU 密集型）重写为 Rust 模块并编译为 WebAssembly，解决 Node.js 在高并发下的算力瓶颈，进一步降低 API 延迟。

2. **Next.js GEO Middleware SDK**： 将本项目核心逻辑封装为标准的 Next.js 中间件 SDK。开发者只需 npm install @geo/sdk，即可通过一行配置为现有的 Next.js 应用开启“GEO 影子模式”，在不侵入原有 UI 代码的情况下自动生成 AI 友好视图。

3. **Agent 技能化与 MCP 支持**： 适配 Model Context Protocol (MCP) 标准，将 GEO 解析能力封装为通用 Skill。使 Claude Desktop、Cursor 等 IDE 或智能体能够通过标准协议直接调用本服务，实时获取网页的深度语义数据。

4. **企业级批量处理服务 (GaaS)**： 构建支持高并发的 Batch API，允许 AI 搜索引擎或模型训练方一次性提交数千个 URL。引入消息队列（Kafka/RabbitMQ）削峰填谷，提供稳定可靠的清洗后语料服务（GEO-as-a-Service）。

---

## 📦 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问应用
open http://localhost:3000

# 访问api文档
open http://localhost:3000/api-docs

```
