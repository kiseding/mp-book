# mp-book

一个基于 Cloudflare Workers + Hono + React 的轻量电子书馆，支持 **OPDS** 和 **Legado（阅读 3.0）** 双引擎书源。

支持在线搜索书籍、目录浏览、章节阅读、EPUB/PDF 在线阅读、书架与阅读历史。Legado 书源可通过 UI 管理界面自由添加。

## 特性

- 🌐 **双引擎**：OPDS 标准协议 + Legado（阅读 3.0）书源格式
- 🔍 **多源搜索**：跨所有可用书源同时搜索
- 📚 **分类目录**：支持 OPDS 导航目录和 Legado 分类浏览
- 📖 **EPUB/PDF 在线阅读**：基于 epubjs 渲染
- 📄 **章节阅读**：Legado 书源章节加载、上下翻页
- 🎨 **书源管理**：Web UI 直接导入/订阅/启停自定义 Legado 书源
- 💾 **书架与历史**：本地 localStorage 持久化
- 🌙 **深色模式**
- 📱 **响应式设计**：桌面 + 移动端
- 🚀 **一键部署**：GitHub Actions 自动部署到 Cloudflare Workers

## 本地开发

### 前置条件

- Node.js >= 18
- npm

### 安装

```bash
# 克隆项目
git clone <你的仓库地址>
cd mp-book

# 安装后端依赖
npm install

# 安装前端依赖
cd web && npm install && cd ..
```

### 配置开发环境

在项目根目录创建 `.dev.vars` 文件（已加入 `.gitignore`，不会提交）：

```bash
# 启用 Legado 书源
LEGADO_ENABLED=true

# Legado 书源订阅地址（逗号分隔）
LEGADO_SUBSCRIPTION_URLS=https://legado.aoaostar.com/sources/71e56d4f.json

# 可选：直接配置 Legado 书源 JSON
# LEGADO_SOURCES_JSON=[{"bookSourceName":"示例","bookSourceUrl":"https://...",...}]

# 可选：OPDS 书源
# OPDS_ENABLED=true
# OPDS_SOURCES_JSON=[{"id":"demo","name":"示例","url":"https://..."}]
```

### 启动

```bash
# 同时启动前后端
npm run dev
```

前端地址：http://localhost:5173（自动代理 API 到后端）  
后端地址：http://localhost:8787

## 书源管理

### Legado 书源

Legado（阅读 3.0）是开源社区广泛使用的书源格式。mp-book 支持两种方式添加：

**1. 环境变量 / Secrets（部署时配置）**

- `LEGADO_ENABLED` — 设置为 `true` 启用
- `LEGADO_SUBSCRIPTION_URLS` — 订阅地址，用逗号/分号/换行分隔
- `LEGADO_SOURCES_JSON` — 直接传入 Legado 书源规则 JSON

**2. Web UI 管理（运行时添加）**

首页点击「管理书源」或导航栏齿轮图标，进入管理页面：

- **导入 JSON** — 粘贴 Legado 书源 JSON（单个、数组或订阅格式对象）
- **订阅地址** — 输入订阅 URL（如 `https://legado.aoaostar.com/sources/xxx.json`）
- **已导入列表** — 查看所有导入记录，启用/停用/删除

> **注意**：本地开发时书源存储在内存中，Worker 重启后丢失。
> 部署到 Cloudflare Workers 时可配置 KV 持久化（见下文「部署」章节）。

### OPDS 书源

通过环境变量 `OPDS_SOURCES_JSON` 配置，支持 Basic Auth、Header Auth 和自定义搜索模板。

## 部署

### 前置：KV 持久化（可选但推荐）

自定义书源要持久化不丢失，需要先创建 KV 命名空间：

```bash
npx wrangler kv:namespace create "CUSTOM_SOURCES"
```

会输出类似：

```
📦 Creating namespace with title "mp-book-CUSTOM_SOURCES"
✨ Success!
Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "CUSTOM_SOURCES"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

将输出的 `[[kv_namespaces]]` 段取消注释填入 `wrangler.toml`。  
如果不配 KV，自定义书源仅存内存，Worker 重启即丢失，但不会报错。

### 方式一：GitHub Actions 自动部署

1. Fork / 创建 GitHub 仓库并推送代码
2. 在 Cloudflare 控制台获取 **Account ID** 和 **API Token**
3. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. 推送任意 commit 到 `main` 分支触发部署
5. 部署完成后，在 Cloudflare 控制台 → Workers & Pages → `mp-book` → Settings → Variables 中添加环境变量（见下方「书源配置示例」）

### 方式二：手动部署

```bash
# 构建前端
cd web && npm run build && cd ..

# 部署 Worker
npx wrangler deploy
```

### 书源配置示例（Cloudflare Variables / Secrets）

```
LEGADO_ENABLED = true
LEGADO_SUBSCRIPTION_URLS = https://legado.aoaostar.com/sources/71e56d4f.json
OPDS_ENABLED = true
OPDS_SOURCES_JSON = [{"id":"standardebooks","name":"Standard Ebooks","url":"https://standardebooks.org/feeds/all.atom","enabled":true}]
```

> 敏感配置（如密码）建议用 **Secrets** 而非明文 Vars。

## API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/books/sources` | 获取所有书源（OPDS + Legado） |
| GET | `/api/books/search?q=关键词&sourceId=可选` | 搜索书籍 |
| GET | `/api/books/catalog?sourceId=&href=可选` | 浏览目录 |
| GET/POST | `/api/books/detail?sourceId=&href=` | 获取书籍详情 |
| GET | `/api/books/chapters?sourceId=&tocHref=` | 获取章节列表（Legado） |
| GET | `/api/books/content?sourceId=&chapterHref=` | 获取章节正文（Legado） |
| GET/POST | `/api/books/read/manifest` | 获取阅读清单（自动判断格式） |
| GET | `/api/books/file?sourceId=&href=` | 代理 EPUB/PDF 文件 |
| GET | `/api/books/image?sourceId=&url=` | 代理图片（反防盗链） |
| **GET** | `/api/books/custom-sources` | 获取自定义书源列表 |
| **POST** | `/api/books/custom-sources` | 添加自定义书源（`action: "import"` 或 `"subscribe"`） |
| **DELETE** | `/api/books/custom-sources/:id` | 删除自定义书源 |
| **PUT** | `/api/books/custom-sources/:id/toggle` | 切换启用/停用 |
| GET/POST | `/api/books/shelf` | 书架（占位） |
| GET/POST | `/api/books/history` | 历史（占位） |

## 项目结构

```
mp-book/
├── src/                          # Hono Workers API
│   ├── index.ts                  # 路由入口 & 中间件
│   ├── types.ts                  # 共享类型定义
│   ├── opds.ts                   # OPDS 客户端
│   ├── ssrf.ts                   # SSRF 安全校验
│   ├── vm-polyfill.ts            # Sandbox JS 执行（Legado 规则）
│   ├── legado/
│   │   ├── client.ts             # Legado 书源引擎（规则解析、搜索、章节、正文）
│   │   ├── subscription-store.ts # 订阅源管理
│   │   └── custom-store.ts       # 用户自定义书源存储（支持 KV + 内存）
├── web/                          # Vite + React 前端
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx          # 首页 - 书源列表
│       │   ├── Search.tsx        # 搜索页
│       │   ├── Catalog.tsx       # 目录浏览
│       │   ├── Detail.tsx        # 书籍详情 + 章节列表
│       │   ├── Read.tsx          # 阅读器（章节/EPUB/PDF）
│       │   ├── Shelf.tsx         # 书架
│       │   └── SourceManager.tsx # 书源管理（导入 JSON/订阅 URL）
│       └── api.ts                # 前端 API 调用
├── wrangler.toml                 # Workers 配置
└── .github/workflows/           # GitHub Actions 自动部署
```

## 技术栈

- **后端**：Cloudflare Workers + Hono
- **前端**：Vite + React 18 + React Router 6 + Tailwind CSS
- **EPUB 渲染**：epubjs
- **HTML 解析**：cheerio（服务端）
- **图标**：lucide-react
- **阅读 3.0 规则**：支持 `@js:` / `<js>` 表达式、CSS 选择器、XPath、JSONPath、正则替换链

## License

MIT
