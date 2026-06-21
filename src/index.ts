import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { opdsClient } from './opds';
import type { BookReadRecord, BookShelfItem } from './types';

export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  OPDS_ENABLED?: string;
  OPDS_SOURCES_JSON?: string;
  OPDS_URL?: string;
  OPDS_NAME?: string;
  OPDS_AUTH_MODE?: string;
  OPDS_USERNAME?: string;
  OPDS_PASSWORD?: string;
  OPDS_HEADER_NAME?: string;
  OPDS_HEADER_VALUE?: string;
  OPDS_SEARCH_TEMPLATE?: string;
  OPDS_CACHE_TTL_MS?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  // 将 Worker vars/secrets 同步到全局，供 OPDS 客户端读取
  const env = c.env;
  const keys: (keyof Env)[] = [
    'OPDS_ENABLED',
    'OPDS_SOURCES_JSON',
    'OPDS_URL',
    'OPDS_NAME',
    'OPDS_AUTH_MODE',
    'OPDS_USERNAME',
    'OPDS_PASSWORD',
    'OPDS_HEADER_NAME',
    'OPDS_HEADER_VALUE',
    'OPDS_SEARCH_TEMPLATE',
    'OPDS_CACHE_TTL_MS',
  ];
  keys.forEach((k) => {
    const value = env[k];
    if (value && typeof value === 'string') (globalThis as unknown as Record<string, string>)[k] = value;
  });
  await next();
});

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/api/health', (c) => c.json({ ok: true, time: Date.now() }));

// 书源列表
app.get('/api/books/sources', async (c) => {
  try {
    const sources = await opdsClient.getSources();
    return c.json({ sources });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// 搜索
app.get('/api/books/search', async (c) => {
  try {
    const q = c.req.query('q')?.trim();
    const sourceId = c.req.query('sourceId')?.trim();
    if (!q) return c.json({ results: [], failedSources: [] });
    const result = await opdsClient.searchBooks(q, sourceId);
    return c.json(result);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// 目录
app.get('/api/books/catalog', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const href = c.req.query('href') || undefined;
    if (!sourceId) return c.json({ error: '缺少 sourceId' }, 400);
    const catalog = await opdsClient.getCatalog(sourceId, href);
    return c.json(catalog);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// 详情
app.get('/api/books/detail', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const href = c.req.query('href');
    if (!sourceId || !href) return c.json({ error: '缺少参数' }, 400);
    const detail = await opdsClient.getBookDetail(sourceId, href);
    return c.json(detail);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

app.post('/api/books/detail', async (c) => {
  try {
    const body = await c.req.json() as { sourceId?: string; href?: string; title?: string; author?: string; cover?: string; summary?: string };
    if (!body.sourceId || !body.href) return c.json({ error: '缺少参数' }, 400);
    const detail = await opdsClient.getBookDetail(body.sourceId, body.href, {
      title: body.title,
      author: body.author,
      cover: body.cover,
      summary: body.summary,
    });
    return c.json(detail);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// 阅读 manifest
app.get('/api/books/read/manifest', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const href = c.req.query('href');
    const acquisitionHref = c.req.query('acquisitionHref');
    if (!sourceId || (!href && !acquisitionHref)) return c.json({ error: '缺少 href / acquisitionHref' }, 400);

    if (acquisitionHref && !href) {
      const format = acquisitionHref.toLowerCase().includes('.pdf') ? 'pdf' : 'epub';
      const detail: import('./types').BookDetail = {
        id: acquisitionHref,
        sourceId,
        sourceName: sourceId,
        title: '在线书籍',
        acquisitionLinks: [{ rel: 'http://opds-spec.org/acquisition', type: format === 'pdf' ? 'application/pdf' : 'application/epub+zip', href: acquisitionHref }],
      };
      return c.json({
        book: detail,
        format,
        fileUrl: `/api/books/file?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(acquisitionHref)}`,
        acquisitionHref,
      });
    }

    const detail = await opdsClient.getBookDetail(sourceId, href!);
    const preferred = await opdsClient.getPreferredAcquisition(sourceId, href!);
    return c.json({
      book: detail,
      format: preferred.format,
      fileUrl: `/api/books/file?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(preferred.href)}`,
      acquisitionHref: preferred.href,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

app.post('/api/books/read/manifest', async (c) => {
  try {
    const body = await c.req.json() as { sourceId?: string; href?: string; acquisitionHref?: string; format?: 'epub' | 'pdf' };
    const sourceId = body.sourceId;
    const href = body.href;
    if (!sourceId || !href) return c.json({ error: '缺少 sourceId / href' }, 400);
    const detail = await opdsClient.getBookDetail(sourceId, href);
    const preferred = body.acquisitionHref
      ? { format: body.format || ('epub' as const), href: body.acquisitionHref }
      : await opdsClient.getPreferredAcquisition(sourceId, href);
    return c.json({
      book: detail,
      format: preferred.format,
      fileUrl: `/api/books/file?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(preferred.href)}`,
      acquisitionHref: preferred.href,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// 文件代理
app.get('/api/books/file', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const href = c.req.query('href');
    if (!sourceId || !href) return c.json({ error: '缺少参数' }, 400);
    return opdsClient.proxyFile(sourceId, href);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// 书架/历史（本地存储为主，云端占位）
app.get('/api/books/shelf', (c) => c.json({}));
app.post('/api/books/shelf', async (c) => {
  try {
    const body = await c.req.json() as { key?: string; item?: BookShelfItem };
    return c.json({ ok: true, key: body.key });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});
app.get('/api/books/history', (c) => c.json({}));
app.post('/api/books/history', async (c) => {
  try {
    const body = await c.req.json() as { key?: string; record?: BookReadRecord };
    return c.json({ ok: true, key: body.key });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// 静态资源与 SPA fallback
app.all('*', async (c) => {
  const assets = c.env.ASSETS;
  if (!assets) {
    return c.text('ASSETS binding not configured', 500);
  }
  const url = new URL(c.req.url);
  const path = url.pathname;

  // 先尝试精确匹配静态资源
  const assetRes = await assets.fetch(c.req.raw);
  if (assetRes.status !== 404) return assetRes;

  // 非 API 路由且非静态资源时返回 index.html（SPA 路由）
  if (!path.startsWith('/api/')) {
    const indexUrl = new URL('/index.html', c.req.url);
    return assets.fetch(new Request(indexUrl, c.req.raw));
  }

  return c.json({ error: 'Not Found' }, 404);
});

export default app;
