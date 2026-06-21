import type {
  BookCatalogResult,
  BookDetail,
  BookReadManifest,
  BookSearchResult,
  BookSource,
} from './types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '请求失败');
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

export async function getSources(): Promise<BookSource[]> {
  const data = await fetchJson<{ sources: BookSource[] }>(`${API_BASE}/books/sources`);
  return data.sources || [];
}

export async function searchBooks(q: string, sourceId?: string): Promise<BookSearchResult> {
  const params = new URLSearchParams({ q });
  if (sourceId) params.set('sourceId', sourceId);
  return fetchJson<BookSearchResult>(`${API_BASE}/books/search?${params.toString()}`);
}

export async function getCatalog(sourceId: string, href?: string): Promise<BookCatalogResult> {
  const params = new URLSearchParams({ sourceId });
  if (href) params.set('href', href);
  return fetchJson<BookCatalogResult>(`${API_BASE}/books/catalog?${params.toString()}`);
}

export async function getBookDetail(sourceId: string, href: string): Promise<BookDetail> {
  const params = new URLSearchParams({ sourceId, href });
  return fetchJson<BookDetail>(`${API_BASE}/books/detail?${params.toString()}`);
}

export async function postBookDetail(payload: {
  sourceId: string;
  href: string;
  title?: string;
  author?: string;
  cover?: string;
  summary?: string;
}): Promise<BookDetail> {
  return fetchJson<BookDetail>(`${API_BASE}/books/detail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getReadManifest(sourceId: string, href: string): Promise<BookReadManifest> {
  const params = new URLSearchParams({ sourceId, href });
  return fetchJson<BookReadManifest>(`${API_BASE}/books/read/manifest?${params.toString()}`);
}

export async function postReadManifest(payload: {
  sourceId: string;
  href: string;
  acquisitionHref?: string;
  format?: 'epub' | 'pdf';
}): Promise<BookReadManifest> {
  return fetchJson<BookReadManifest>(`${API_BASE}/books/read/manifest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
