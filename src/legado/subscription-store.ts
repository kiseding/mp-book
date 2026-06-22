/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BookSource, LegadoBookSourceRule } from '../types';
import { validateProxyUrlServerSide } from '../ssrf';

const TIMEOUT_MS = Number(globalThis.LEGADO_TIMEOUT_MS || 30000);
const MAX_BYTES = Number(globalThis.LEGADO_SUBSCRIPTION_MAX_BYTES || 20 * 1024 * 1024);
const sourcesCache = new Map<string, BookSource[]>();

function stableId(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 16);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTextWithRetry(url: string, retries = 2): Promise<string> {
  const safe = await validateProxyUrlServerSide(url);
  if (!safe) throw new Error('订阅地址未通过安全校验');

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
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
      if (!response.ok) throw new Error(`订阅请求失败: ${response.status}`);
      const contentLength = Number(response.headers.get('content-length') || '0');
      if (contentLength > MAX_BYTES) throw new Error('订阅内容过大');
      const text = await response.text();
      if (text.length > MAX_BYTES) throw new Error('订阅内容过大');
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await wait(300 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('订阅请求失败');
}

function extractRuleList(input: any): LegadoBookSourceRule[] {
  if (Array.isArray(input)) return input.filter((item) => item && typeof item === 'object');
  if (!input || typeof input !== 'object') return [];
  for (const key of ['data', 'sources', 'bookSources', 'items', 'list']) {
    if (Array.isArray((input as any)[key])) return (input as any)[key].filter((item: any) => item && typeof item === 'object');
  }
  return [input];
}

export function normalizeImportedSources(input: unknown): BookSource[] {
  const list = Array.isArray(input) ? input : [input];
  return list
    .filter((item): item is LegadoBookSourceRule => !!item && typeof item === 'object')
    .map((rule, index) => {
      const name = rule.bookSourceName || `Legado 书源 ${index + 1}`;
      const url = rule.bookSourceUrl || '';
      return {
        id: `legado_${stableId(`${name}|${url}|${index}`)}`,
        name,
        type: 'legado' as const,
        url,
        enabled: rule.enabled !== false,
        authMode: 'none' as const,
        preferFormat: ['epub' as const],
        language: '',
        legado: rule,
      };
    })
    .filter((source) => !!source.url);
}

async function loadSubscription(url: string): Promise<BookSource[]> {
  const cached = sourcesCache.get(url);
  if (cached) return cached;

  const text = await fetchTextWithRetry(url);
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('订阅内容不是合法 JSON');
  }
  const rules = extractRuleList(parsed);
  const sources = normalizeImportedSources(rules);
  if (sources.length === 0) throw new Error('订阅内没有识别到有效 Legado 书源');
  sourcesCache.set(url, sources);
  return sources;
}

export async function getSubscriptionSources(): Promise<BookSource[]> {
  const urlsRaw = globalThis.LEGADO_SUBSCRIPTION_URLS || '';
  if (!urlsRaw) return [];
  const urls = urlsRaw.split(/[,;\n]+/).map((u: string) => u.trim()).filter(Boolean);
  const groups = await Promise.all(urls.map((url: string) => loadSubscription(url).catch(() => [])));
  return groups.flat();
}
