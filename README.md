# mp-book

基于 **Cloudflare Workers** 的轻量电子书馆，支持 **OPDS** 和 **Legado（阅读 3.0）** 双引擎书源。

所有网络请求均通过 Worker 端发起，充分利用 Cloudflare 全球网络加速访问海外书源。内置多用户认证和管理后台。

## 特性

- 🌐 **双引擎** — OPDS 标准协议 + Legado（阅读 3.0）书源格式
- 🔍 **流式搜索** — 跨所有书源并行搜索，SSE 实时推送进度
- 👥 **多用户** — HMAC-SHA256 令牌认证，支持 `owner` / `admin` / `user` 角色
- 📊 **用户管理** — Web UI 管理用户（owner 专用）
- 📚 **EPUB/PDF 在线阅读** — epubjs 渲染 + 分页
- 📄 **章节阅读** — Legado 书源章节加载、上下翻页、目录侧栏
- 🎨 **书源管理** — Web UI 导入/订阅/启停自定义 Legado 书源
- 💾 **书架与历史** — localStorage 持久化
- 🚀 **Worker 网络** — 所有外部图片、文件、内容走 Worker 代理，自带翻墙
- 🌙 **深色模式**
- 📱 **响应式设计** — 桌面 + 移动端适配
- ⚙️ **GitHub Actions** — 自动部署，所有变量通过 GitHub Secrets 管理

## 快速开始

### 前置条件

- Node.js >= 18
- npm
- Cloudflare 账户

### 本地开发

```bash
# 克隆并安装
git clone https://github.com/kiseding/mp-book.git
cd mp-book
npm install
cd web && npm install && cd ..

# 创建本地开发凭据
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 设置你的本地用户名密码

# 启动（前后端同时）
npm run dev
```

前端 http://localhost:5173（自动代理 API 到后端）  
后端 http://localhost:8787

首次访问会自动重定向到登录页，使用 `.dev.vars` 中配置的 `USERNAME` / `PASSWORD` 登录。

### 部署到 Cloudflare Workers

#### 1. 配置 GitHub Secrets

在 GitHub 仓库 → **Settings → Secrets and variables → Actions** 添加以下 **Secrets**：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 令牌（需 Workers 权限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `USERNAME` | 超级管理员用户名 |
| `PASSWORD` | 超级管理员密码 |
| `KV_NAMESPACE_ID` | （可选）KV 命名空间 ID，用于持久化自定义书源 |

以及可选的 **Variables**（非敏感配置）：

| Variable | 说明 |
|----------|------|
| `NODE_ENV` | 默认 `production` |
| `LEGADO_ENABLED` | 启用 Legado 书源（`true` / `false`） |
| `LEGADO_SOURCES_JSON` | Legado 书源规则 JSON |
| `LEGADO_SUBSCRIPTION_URLS` | Legado 书源订阅地址 |
| `OPDS_ENABLED` | 启用 OPDS 书源 |
| `OPDS_SOURCES_JSON` | OPDS 书源 JSON |
| `OPDS_URL` | OPDS 默认书源 URL |

#### 2. 配置 KV 持久化（可选但推荐）

不配 KV 不影响使用，但自定义书源仅存内存，Worker 重启后丢失。

```bash
npx wrangler kv:namespace create "CUSTOM_SOURCES"
```

将输出的 `id` 添加到 GitHub → **Secrets** → `KV_NAMESPACE_ID`。

#### 3. 推送触发部署

```bash
git push origin main
```

GitHub Actions 自动构建前端 → 注入 Secrets/Variables → 部署到 Workers。

部署完成后，也可在 **Cloudflare Dashboard → Workers → mp-book → Settings → Variables** 查看和管理所有环境变量。

### 添加更多用户

部署后用 `owner` 账号登录 → 导航栏点击用户图标 → 进入用户管理页面，可创建/编辑/删除普通用户和管理员。

## 书源配置

### Legado 书源

Legado（阅读 3.0）是开源社区广泛使用的书源格式。支持三种方式添加：

**1. 环境变量（部署时配置）**

```bash
LEGADO_ENABLED=true
LEGADO_SUBSCRIPTION_URLS=https://legado.aoaostar.com/sources/71e56d4f.json,https://另一个订阅地址.json
LEGADO_SOURCES_JSON=[{"bookSourceName":"示例","bookSourceUrl":"https://example.com"}]
```

**2. Web UI 管理（运行时添加）**

登录后点击「管理书源」：
- **导入 JSON** — 粘贴 Legado 书源 JSON（支持单个、数组、订阅格式）
- **订阅地址** — 输入远程订阅 URL
- **已导入列表** — 启用/停用/删除

**3. 自定义书源存储**

Web UI 添加的书源存储在 KV 中，按用户隔离（每个用户只能看到自己添加的书源）。

### OPDS 书源

通过环境变量配置：

```bash
OPDS_ENABLED=true
OPDS_SOURCES_JSON=[{"id":"demo","name":"标准书库","url":"https://standardebooks.org/feeds/all.atom","enabled":true}]
```

支持 Basic Auth、Header Auth 和自定义搜索模板。

## 用户系统

| 角色 | 权限 |
|------|------|
| `owner` | 超级管理员，由环境变量 `USERNAME`/`PASSWORD` 定义，不可删除 |
| `admin` | 普通管理员，由 owner 在管理后台创建，可管理书源 |
| `user` | 普通用户，仅可搜索和自己管理书源 |

- 认证方式：HMAC-SHA256 签名令牌（24h 有效期，7d 刷新）
- 令牌存储在 `auth` cookie 和 `Authorization` header

## API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| **认证** | | |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户信息 |
| **用户管理（owner 专用）** | | |
| GET | `/api/auth/admin/users` | 用户列表 |
| POST | `/api/auth/admin/users` | 创建用户 |
| PUT | `/api/auth/admin/users/:username` | 修改用户 |
| DELETE | `/api/auth/admin/users/:username` | 删除用户 |
| **书源** | | |
| GET | `/api/books/sources` | 获取所有书源 |
| GET | `/api/books/search?q=` | 搜索书籍 |
| GET | `/api/books/search/stream?q=` | SSE 流式搜索 |
| GET | `/api/books/catalog?sourceId=&href=` | 浏览目录 |
| GET | `/api/books/detail?sourceId=&href=` | 书籍详情 |
| **阅读** | | |
| GET | `/api/books/chapters?sourceId=&tocHref=` | 章节列表（Legado） |
| GET | `/api/books/content?sourceId=&chapterHref=` | 章节正文（Legado） |
| GET/POST | `/api/books/read/manifest` | 阅读清单 |
| GET | `/api/books/file?sourceId=&href=` | 代理 EPUB/PDF 文件 |
| **代理** | | |
| GET | `/api/image-proxy?url=` | 通用资源代理（走 Worker 网络） |
| GET | `/api/books/image?sourceId=&url=` | 图片代理（反防盗链） |
| **自定义书源（用户隔离）** | | |
| GET | `/api/books/custom-sources` | 获取我的自定义书源 |
| POST | `/api/books/custom-sources` | 导入/订阅 |
| DELETE | `/api/books/custom-sources/:id` | 删除 |
| PUT | `/api/books/custom-sources/:id/toggle` | 启用/停用 |

## 项目结构

```
mp-book/
├── src/                          # Workers 后端
│   ├── index.ts                  # 路由入口、中间件、SSE 流式搜索
│   ├── types.ts                  # 共享类型
│   ├── opds.ts                   # OPDS 客户端
│   ├── ssrf.ts                   # SSRF 安全校验
│   ├── vm-polyfill.ts            # JS 沙箱（Legado 规则执行）
│   ├── auth/                     # 多用户认证
│   │   ├── auth-utils.ts         # HMAC-SHA256 签名、令牌
│   │   ├── middleware.ts         # Hono 认证中间件
│   │   ├── routes.ts             # 登录/登出/用户信息
│   │   ├── admin-routes.ts       # 用户管理 CRUD
│   │   └── user-store.ts         # KV 用户存储（SHA-256 密码）
│   └── legado/                   # Legado 书源引擎
│       ├── client.ts             # 规则解析、搜索、章节、正文
│       ├── custom-store.ts       # 用户自定义书源存储（KV 多用户隔离）
│       └── subscription-store.ts # 订阅源管理
├── web/                          # React 前端
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx          # 首页
│       │   ├── Search.tsx        # 搜索（SSE 流式）
│       │   ├── Catalog.tsx       # 目录浏览
│       │   ├── Detail.tsx        # 书籍详情
│       │   ├── Read.tsx          # 阅读器（章节/EPUB/PDF）
│       │   ├── Shelf.tsx         # 书架 & 历史
│       │   ├── Login.tsx         # 登录页
│       │   ├── SourceManager.tsx # 书源管理
│       │   └── UserManager.tsx   # 用户管理（owner 专用）
│       ├── stores/
│       │   └── auth.ts           # Zustand 认证状态
│       ├── api.ts                # API 调用封装
│       └── utils.ts              # 工具函数（URL 代理等）
├── wrangler.toml                 # Workers 配置
└── .github/workflows/deploy.yml  # GitHub Actions 自动部署
```

## 技术栈

| 层 | 技术 |
|----|------|
| 运行时 | Cloudflare Workers |
| 后端框架 | Hono |
| 前端 | React 18 + Vite |
| 路由 | React Router 6 |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand + persist |
| 图标 | lucide-react |
| EPUB 渲染 | epubjs |
| HTML 解析 | cheerio（服务端） |
| 认证 | HMAC-SHA256（Web Crypto API） |
| 持久化 | Cloudflare KV（用户/书源） |
| 搜索 | SSE 流式推送 |

## License

MIT
