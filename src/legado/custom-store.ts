/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 自定义 Legado 书源存储
 *
 * 支持 Cloudflare Workers KV 持久化 + 内存缓存。
 * 如果未绑定 KV，自动降级为纯内存存储（重启后丢失）。
 */

import type { BookSource, LegadoBookSourceRule } from '../types';

// ── 类型 ────────────────────────────────────────────────

export interface CustomSourceEntry {
  id: string;
  source: 'manual' | 'subscription' | 'import';
  raw: string;
  addedAt: number;
  enabled: boolean;
  sources: BookSource[];
  lastError?: string;
}

// ── 常量 ────────────────────────────────────────────────

const KV_KEY = 'custom:sources:registry';
const CACHE_TTL_MS = 60_000; // 内存缓存 60 秒后重新读取 KV

// ── 内存状态 ────────────────────────────────────────────

let _kv: KVNamespace | null = null;
let _cache: { data: CustomSourceEntry[]; ts: number } | null = null;
let _store = new Map<string, CustomSourceEntry>(); // 纯内存模式时使用

/** 设置 KV 绑定（在 middleware 中调用） */
export function setKvBinding(kv: KVNamespace | null) {
  _kv = kv;
  if (!kv) {
    // 切换到纯内存模式时，清空缓存让它走 _store
    _cache = null;
  }
}

export function hasKvBinding(): boolean {
  return _kv !== null;
}

// ── 内部 KV 读写 ────────────────────────────────────────

async function readAll(): Promise<CustomSourceEntry[]> {
  // 有 KV + 缓存未过期
  if (_kv && _cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return _cache.data;
  }

  if (_kv) {
    try {
      const raw = await _kv.get(KV_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CustomSourceEntry[];
        if (Array.isArray(parsed)) {
          _cache = { data: parsed, ts: Date.now() };
          return parsed;
        }
      }
    } catch { /* 读 KV 失败，回退到内存 */ }
    // KV 为空 → 初始化为空数组
    _cache = { data: [], ts: Date.now() };
    return [];
  }

  // 纯内存模式
  return Array.from(_store.values());
}

async function writeAll(entries: CustomSourceEntry[]) {
  if (_kv) {
    try {
      await _kv.put(KV_KEY, JSON.stringify(entries));
      _cache = { data: entries, ts: Date.now() };
    } catch { /* KV 写入失败，仅保留内存 */ }
  }
  // 纯内存模式：同步到 _store
  _store = new Map(entries.map((e) => [e.id, e]));
}

// ── 公开方法（全部 async） ──────────────────────────────

/** 获取所有自定义书源条目 */
export async function getAllEntries(): Promise<CustomSourceEntry[]> {
  const entries = await readAll();
  return entries.sort((a, b) => b.addedAt - a.addedAt);
}

/** 获取启用的自定义书源列表 */
export async function getEnabledSources(): Promise<BookSource[]> {
  const entries = await readAll();
  const enabled: BookSource[] = [];
  for (const entry of entries) {
    if (!entry.enabled) continue;
    for (const source of entry.sources) {
      if (source.enabled !== false) {
        enabled.push(source);
      }
    }
  }
  return enabled;
}

export async function getEntry(id: string): Promise<CustomSourceEntry | undefined> {
  const entries = await readAll();
  return entries.find((e) => e.id === id);
}

/**
 * 通过解析 JSON 添加一组自定义书源
 */
export async function addCustomSources(rawJson: string): Promise<{ entry: CustomSourceEntry; errors: string[] }> {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('JSON 解析失败：内容不是合法 JSON');
  }

  const rules = extractRuleList(parsed);
  if (rules.length === 0) {
    throw new Error('导入失败：未识别到有效的 Legado 书源');
  }

  const errors: string[] = [];
  const sources: BookSource[] = [];
  for (const rule of rules) {
    try {
      const normalized = normalizeSource(rule);
      if (normalized) sources.push(normalized);
    } catch (e) {
      errors.push(`${rule.bookSourceName || '未知'}: ${(e as Error).message}`);
    }
  }

  if (sources.length === 0 && errors.length > 0) {
    throw new Error(`导入失败：${errors[errors.length - 1]}`);
  }

  const id = `custom_${Date.now()}_${stableId(rawJson)}`;
  const entry: CustomSourceEntry = {
    id,
    source: 'manual',
    raw: rawJson,
    addedAt: Date.now(),
    enabled: true,
    sources,
    lastError: errors.length > 0 ? errors[errors.length - 1] : undefined,
  };

  const entries = await readAll();
  entries.push(entry);
  await writeAll(entries);
  return { entry, errors };
}

/**
 * 通过订阅 URL 添加自定义书源
 */
export async function addSubscriptionSource(url: string): Promise<{ entry: CustomSourceEntry; errors: string[] }> {
  const text = await fetchSubscription(url);
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('订阅内容不是合法 JSON');
  }

  const rules = extractRuleList(parsed);
  if (rules.length === 0) {
    throw new Error('订阅内没有识别到有效 Legado 书源');
  }

  const errors: string[] = [];
  const sources: BookSource[] = [];
  for (const rule of rules) {
    try {
      const normalized = normalizeSource(rule);
      if (normalized) sources.push(normalized);
    } catch (e) {
      errors.push(`${rule.bookSourceName || '未知'}: ${(e as Error).message}`);
    }
  }

  const id = `custom_${Date.now()}_${stableId(url)}`;
  const entry: CustomSourceEntry = {
    id,
    source: 'subscription',
    raw: url,
    addedAt: Date.now(),
    enabled: true,
    sources,
    lastError: errors.length > 0 ? errors[errors.length - 1] : undefined,
  };

  const entries = await readAll();
  entries.push(entry);
  await writeAll(entries);
  return { entry, errors };
}

/** 删除一组自定义书源 */
export async function removeCustomSource(id: string): Promise<boolean> {
  const entries = await readAll();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  entries.splice(idx, 1);
  await writeAll(entries);
  return true;
}

/** 切换启用状态 */
export async function toggleCustomSource(id: string): Promise<CustomSourceEntry | null> {
  const entries = await readAll();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  entry.enabled = !entry.enabled;
  await writeAll(entries);
  return entry;
}

/** 获取统计 */
export async function getStats() {
  const entries = await readAll();
  let totalSources = 0;
  let enabledSources = 0;
  for (const entry of entries) {
    totalSources += entry.sources.length;
    if (entry.enabled) {
      enabledSources += entry.sources.filter((s) => s.enabled !== false).length;
    }
  }
  return { entries: entries.length, totalSources, enabledSources };
}

// ── 内部工具 ────────────────────────────────────────────

function stableId(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 16);
}

function extractRuleList(input: any): LegadoBookSourceRule[] {
  if (Array.isArray(input)) return input.filter((item) => item && typeof item === 'object');
  if (!input || typeof input !== 'object') return [];
  for (const key of ['data', 'sources', 'bookSources', 'items', 'list']) {
    if (Array.isArray((input as any)[key])) return (input as any)[key].filter((item: any) => item && typeof item === 'object');
  }
  return [input];
}

function normalizeSource(rule: LegadoBookSourceRule): BookSource | null {
  const name = rule.bookSourceName || '未命名书源';
  const url = rule.bookSourceUrl || '';
  if (!url) return null;
  return {
    id: `legado_${stableId(`${name}|${url}`)}`,
    name,
    type: 'legado',
    url,
    enabled: rule.enabled !== false,
    authMode: 'none',
    preferFormat: ['epub'],
    language: '',
    legado: rule,
  };
}

async function fetchSubscription(url: string): Promise<string> {
  const TIMEOUT_MS = 20000;
  const MAX_BYTES = 5 * 1024 * 1024;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
      },
    });
    if (!response.ok) throw new Error(`请求失败: ${response.status}`);
    const contentLength = Number(response.headers.get('content-length') || '0');
    if (contentLength > MAX_BYTES) throw new Error('订阅内容过大');
    const text = await response.text();
    if (text.length > MAX_BYTES) throw new Error('订阅内容过大');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
