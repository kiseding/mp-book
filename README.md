# mp-book

一个基于 Cloudflare Workers + Hono + React 的轻量电子书馆，支持 OPDS 书源搜索、目录浏览、EPUB/PDF 在线阅读、书架与阅读历史。

## 特性

- 🌐 OPDS 书源代理：自动探测搜索/目录能力
- 🔍 多源书籍搜索
- 📚 分类目录浏览
- 📖 EPUB / PDF 在线阅读
- 💾 本地书架与阅读历史（localStorage）
- 🌙 深色模式
- 📱 响应式设计
- 🚀 GitHub Actions 自动部署到 Cloudflare Workers

## 本地开发

```bash
# 安装依赖
npm install
cd web && npm install && cd ..

# 配置环境变量（可选，用于测试 OPDS 源）
export OPDS_ENABLED=true
export OPDS_SOURCES_JSON='[{"id":"demo","name":"示例","url":"https://你的opds地址","enabled":true}]'

# 同时启动前后端
npm run dev
```

前端地址：http://localhost:5173  
后端地址：http://localhost:8787

## 部署

1. Fork / 创建 GitHub 仓库并推送代码
2. 在 Cloudflare 控制台获取 **Account ID** 和 **API Token**
3. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. 推送任意 commit 到 `main` 分支触发部署
5. 部署完成后，在 Cloudflare 控制台 → Workers & Pages → `mp-book` → Settings → Variables 中添加书源配置（可通过 Secrets 或 Vars）：
   - `OPDS_ENABLED` = `true`
   - `OPDS_SOURCES_JSON` = 你的 OPDS 书源 JSON 数组（见下方示例）

## 书源配置

可通过 Secrets 配置多个 OPDS 源：

```json
[
  {
    "id": "standardebooks",
    "name": "Standard Ebooks",
    "url": "https://standardebooks.org/feeds/all.atom",
    "enabled": true
  }
]
```

支持 Basic Auth、Header Auth 和自定义搜索模板。

## 目录结构

```
mp-book/
├── src/               # Hono Workers API
│   ├── index.ts       # 路由入口
│   ├── opds.ts        # OPDS 客户端
│   └── types.ts       # 共享类型
├── web/               # Vite + React 前端
│   └── src/
├── wrangler.toml      # Workers 配置
└── .github/workflows/ # GitHub Actions 部署
```

## License

MIT
