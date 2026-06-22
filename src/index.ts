import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { opdsClient } from './opds';
import { legadoClient } from './legado/client';
import type { BookReadRecord, BookShelfItem, BookSource } from './types';
import {
  getAllEntries,
  addCustomSources,
  addSubscriptionSource,
  removeCustomSource,
  toggleCustomSource,
  getStats,
  setKvBinding,
} from './legado/custom-store';

export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  CUSTOM_SOURCES?: KVNamespace;
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
  LEGADO_ENABLED?: string;
  LEGADO_SOURCES_JSON?: string;
  LEGADO_SUBSCRIPTION_URLS?: string;
  LEGADO_TIMEOUT_MS?: string;
  LEGADO_CACHE_TTL_MS?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const env = c.env;
  const keys: (keyof Env)[] = [
    'OPDS_ENABLED', 'OPDS_SOURCES_JSON', 'OPDS_URL', 'OPDS_NAME',
    'OPDS_AUTH_MODE', 'OPDS_USERNAME', 'OPDS_PASSWORD',
    'OPDS_HEADER_NAME', 'OPDS_HEADER_VALUE', 'OPDS_SEARCH_TEMPLATE',
    'OPDS_CACHE_TTL_MS',
    'LEGADO_ENABLED', 'LEGADO_SOURCES_JSON', 'LEGADO_SUBSCRIPTION_URLS',
    'LEGADO_TIMEOUT_MS', 'LEGADO_CACHE_TTL_MS',
  ];
  keys.forEach((k) => {
    const value = env[k];
    if (value && typeof value === 'string') (globalThis as unknown as Record<string, string>)[k] = value;
  });
  // 传递 KV 绑定到自定义书源存储
  setKvBinding((env as any).CUSTOM_SOURCES || null);
  await next();
});

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/api/health', (c) => c.json({ ok: true, time: Date.now() }));

// ── 书源管理 ──────────────────────────────────────────────

let sourceTypeCache: Map<string, 'opds' | 'legado'> | null = null;

async function buildSourceTypeCache(): Promise<Map<string, 'opds' | 'legado'>> {
  if (sourceTypeCache) return sourceTypeCache;
  const [opdsSources, legadoSources] = await Promise.all([
    opdsClient.getSources().catch(() => []),
    legadoClient.getSources().catch(() => []),
  ]);
  const map = new Map<string, 'opds' | 'legado'>();
  opdsSources.forEach((s) => map.set(s.id, 'opds'));
  legadoSources.forEach((s) => map.set(s.id, 'legado'));
  sourceTypeCache = map;
  // 30秒后刷新
  setTimeout(() => { sourceTypeCache = null; }, 30000);
  return map;
}

async function resolveSourceType(sourceId: string): Promise<'opds' | 'legado'> {
  if (sourceId.startsWith('legado_')) return 'legado';
  const map = await buildSourceTypeCache();
  return map.get(sourceId) || 'opds';
}

app.get('/api/books/sources', async (c) => {
  try {
    sourceTypeCache = null; // 强制刷新
    const [opdsSources, legadoSources] = await Promise.all([
      opdsClient.getSources(),
      legadoClient.getSources(),
    ]);
    return c.json({ sources: [...opdsSources, ...legadoSources] });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ── 搜索 ──────────────────────────────────────────────────

app.get('/api/books/search', async (c) => {
  try {
    const q = c.req.query('q')?.trim();
    const sourceId = c.req.query('sourceId')?.trim();
    if (!q) return c.json({ results: [], failedSources: [] });

    if (sourceId) {
      const type = await resolveSourceType(sourceId);
      return c.json(
        type === 'legado'
          ? await legadoClient.searchBooks(q, sourceId)
          : await opdsClient.searchBooks(q, sourceId)
      );
    }

    const [opdsResult, legadoResult] = await Promise.allSettled([
      opdsClient.searchBooks(q),
      legadoClient.searchBooks(q),
    ]);

    const results: import('./types').BookListItem[] = [];
    const failedSources: import('./types').BookSearchFailure[] = [];

    if (opdsResult.status === 'fulfilled') {
      results.push(...opdsResult.value.results);
      failedSources.push(...opdsResult.value.failedSources);
    } else {
      failedSources.push({ sourceId: 'opds', sourceName: 'OPDS', error: opdsResult.reason?.message || 'OPDS 搜索失败' });
    }
    if (legadoResult.status === 'fulfilled') {
      results.push(...legadoResult.value.results);
      failedSources.push(...legadoResult.value.failedSources);
    } else {
      failedSources.push({ sourceId: 'legado', sourceName: 'Legado', error: legadoResult.reason?.message || 'Legado 搜索失败' });
    }

    return c.json({ results, failedSources });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ── 目录浏览 ──────────────────────────────────────────────

app.get('/api/books/catalog', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const href = c.req.query('href') || undefined;
    if (!sourceId) return c.json({ error: '缺少 sourceId' }, 400);

    const type = await resolveSourceType(sourceId);
    return c.json(
      type === 'legado'
        ? await legadoClient.getCatalog(sourceId, href)
        : await opdsClient.getCatalog(sourceId, href)
    );
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ── 书籍详情 ──────────────────────────────────────────────

app.get('/api/books/detail', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const href = c.req.query('href');
    if (!sourceId || !href) return c.json({ error: '缺少参数' }, 400);

    const type = await resolveSourceType(sourceId);
    return c.json(
      type === 'legado'
        ? await legadoClient.getBookDetail(sourceId, href)
        : await opdsClient.getBookDetail(sourceId, href)
    );
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

app.post('/api/books/detail', async (c) => {
  try {
    const body = await c.req.json() as { sourceId?: string; href?: string; title?: string; author?: string; cover?: string; summary?: string };
    if (!body.sourceId || !body.href) return c.json({ error: '缺少参数' }, 400);

    const type = await resolveSourceType(body.sourceId);
    return c.json(
      type === 'legado'
        ? await legadoClient.getBookDetail(body.sourceId, body.href, body)
        : await opdsClient.getBookDetail(body.sourceId, body.href, body)
    );
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ── 章节列表（Legado） ──────────────────────────────────

app.get('/api/books/chapters', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const tocHref = c.req.query('tocHref');
    if (!sourceId || !tocHref) return c.json({ error: '缺少参数' }, 400);
    const chapters = await legadoClient.getChapters(sourceId, tocHref);
    return c.json({ chapters });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ── 章节正文（Legado） ──────────────────────────────────

app.get('/api/books/content', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const chapterHref = c.req.query('chapterHref');
    const tocHref = c.req.query('tocHref');
    if (!sourceId || !chapterHref) return c.json({ error: '缺少参数' }, 400);
    const content = await legadoClient.getChapterContent(sourceId, chapterHref, tocHref);
    return c.json(content);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ── 阅读 manifest ───────────────────────────────────────

app.get('/api/books/read/manifest', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const href = c.req.query('href');
    const acquisitionHref = c.req.query('acquisitionHref');
    if (!sourceId || (!href && !acquisitionHref)) return c.json({ error: '缺少 href / acquisitionHref' }, 400);

    const type = await resolveSourceType(sourceId);
    if (type === 'legado') {
      const detail = acquisitionHref && !href
        ? await legadoClient.getBookDetail(sourceId, acquisitionHref)
        : await legadoClient.getBookDetail(sourceId, href!);
      const tocLink = detail.acquisitionLinks.find((l) => l.rel === 'legado:chapters');
      return c.json({
        book: detail,
        format: 'chapters' as const,
        chaptersUrl: tocLink
          ? `/api/books/chapters?sourceId=${encodeURIComponent(sourceId)}&tocHref=${encodeURIComponent(tocLink.href)}`
          : undefined,
        acquisitionHref: tocLink?.href,
      });
    }

    // OPDS
    if (acquisitionHref && !href) {
      const pdf = acquisitionHref.toLowerCase().includes('.pdf');
      return c.json({
        book: {
          id: acquisitionHref,
          sourceId,
          sourceName: sourceId,
          title: '在线书籍',
          acquisitionLinks: [{ rel: 'http://opds-spec.org/acquisition', type: pdf ? 'application/pdf' : 'application/epub+zip', href: acquisitionHref }],
        },
        format: pdf ? 'pdf' : 'epub',
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
    const body = await c.req.json() as { sourceId?: string; href?: string; acquisitionHref?: string; format?: 'epub' | 'pdf' | 'chapters' };
    const { sourceId, href } = body;
    if (!sourceId || !href) return c.json({ error: '缺少 sourceId / href' }, 400);

    const type = await resolveSourceType(sourceId);
    if (type === 'legado') {
      const detail = await legadoClient.getBookDetail(sourceId, href);
      const tocLink = detail.acquisitionLinks.find((l) => l.rel === 'legado:chapters');
      return c.json({
        book: detail,
        format: 'chapters' as const,
        chaptersUrl: tocLink
          ? `/api/books/chapters?sourceId=${encodeURIComponent(sourceId)}&tocHref=${encodeURIComponent(tocLink.href)}`
          : undefined,
        acquisitionHref: tocLink?.href,
      });
    }

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

// ── 文件 / 图片代理 ─────────────────────────────────────

app.get('/api/books/file', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const href = c.req.query('href');
    if (!sourceId || !href) return c.json({ error: '缺少参数' }, 400);
    const type = await resolveSourceType(sourceId);
    if (type === 'legado') return c.json({ error: 'Legado 书源不支持文件代理' }, 400);
    return opdsClient.proxyFile(sourceId, href);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

app.get('/api/books/image', async (c) => {
  try {
    const sourceId = c.req.query('sourceId');
    const url = c.req.query('url');
    if (!sourceId || !url) return c.json({ error: '缺少参数' }, 400);
    const source = await legadoClient.getSourceById(sourceId);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        Referer: source.url,
      },
    });
    const headers = new Headers();
    const ct = response.headers.get('content-type');
    if (ct) headers.set('content-type', ct);
    headers.set('cache-control', 'public, max-age=86400');
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ── 自定义书源管理 ──────────────────────────────────────

app.get('/api/books/custom-sources', async (c) => {
  const [entries, stats] = await Promise.all([getAllEntries(), getStats()]);
  return c.json({ entries, stats });
});

app.post('/api/books/custom-sources', async (c) => {
  try {
    const body = await c.req.json() as { action?: string; raw?: string; url?: string };

    if (body.action === 'import') {
      if (!body.raw) return c.json({ error: '缺少 raw 字段' }, 400);
      const { entry, errors } = await addCustomSources(body.raw);
      return c.json({ ok: true, entry, errors });
    }

    if (body.action === 'subscribe') {
      if (!body.url) return c.json({ error: '缺少 url 字段' }, 400);
      // 基本的 URL 校验
      try { new URL(body.url); } catch { return c.json({ error: '订阅地址不是合法 URL' }, 400); }
      const { entry, errors } = await addSubscriptionSource(body.url);
      return c.json({ ok: true, entry, errors });
    }

    return c.json({ error: '未知操作，请指定 action: "import" 或 "subscribe"' }, 400);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

app.delete('/api/books/custom-sources/:id', async (c) => {
  const id = c.req.param('id');
  const ok = await removeCustomSource(id);
  if (!ok) return c.json({ error: '未找到该自定义书源' }, 404);
  return c.json({ ok: true });
});

app.put('/api/books/custom-sources/:id/toggle', async (c) => {
  const id = c.req.param('id');
  const entry = await toggleCustomSource(id);
  if (!entry) return c.json({ error: '未找到该自定义书源' }, 404);
  return c.json({ ok: true, entry });
});

// ── 书架 / 历史（云端占位） ────────────────────────────

app.get('/api/books/shelf', (c) => c.json({}));
app.post('/api/books/shelf', async (c) => {
  const body = await c.req.json() as { key?: string; item?: BookShelfItem };
  return c.json({ ok: true, key: body.key });
});
app.get('/api/books/history', (c) => c.json({}));
app.post('/api/books/history', async (c) => {
  const body = await c.req.json() as { key?: string; record?: BookReadRecord };
  return c.json({ ok: true, key: body.key });
});

// ── 静态资源 & SPA fallback ────────────────────────────

app.all('*', async (c) => {
  const assets = c.env.ASSETS;
  if (!assets) return c.text('ASSETS binding not configured', 500);

  const assetRes = await assets.fetch(c.req.raw);
  if (assetRes.status !== 404) return assetRes;

  if (!c.req.path.startsWith('/api/')) {
    return assets.fetch(new Request(new URL('/index.html', c.req.url), c.req.raw));
  }

  return c.json({ error: 'Not Found' }, 404);
});

export default app;
