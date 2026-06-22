import type {
  BookCatalogResult,
  BookChapter,
  BookChapterContent,
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
  format?: 'epub' | 'pdf' | 'chapters';
}): Promise<BookReadManifest> {
  return fetchJson<BookReadManifest>(`${API_BASE}/books/read/manifest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ── Legado 特有 API ───────────────────────────────────────

export async function getLegadoChapters(sourceId: string, tocHref: string): Promise<BookChapter[]> {
  const params = new URLSearchParams({ sourceId, tocHref });
  const data = await fetchJson<{ chapters: BookChapter[] }>(`${API_BASE}/books/chapters?${params.toString()}`);
  return data.chapters || [];
}

export async function getChapterContent(sourceId: string, chapterHref: string, tocHref?: string): Promise<BookChapterContent> {
  const params = new URLSearchParams({ sourceId, chapterHref });
  if (tocHref) params.set('tocHref', tocHref);
  return fetchJson<BookChapterContent>(`${API_BASE}/books/content?${params.toString()}`);
}

// ── 自定义书源管理 ───────────────────────────────────────

export interface CustomSourceEntry {
  id: string;
  source: 'manual' | 'subscription' | 'import';
  raw: string;
  addedAt: number;
  enabled: boolean;
  sources: BookSource[];
  lastError?: string;
}

export async function getCustomSources(): Promise<{ entries: CustomSourceEntry[]; stats: { entries: number; totalSources: number; enabledSources: number } }> {
  return fetchJson(`${API_BASE}/books/custom-sources`);
}

export async function importCustomSources(raw: string): Promise<{ ok: boolean; entry: CustomSourceEntry; errors: string[] }> {
  return fetchJson(`${API_BASE}/books/custom-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'import', raw }),
  });
}

export async function subscribeCustomSource(url: string): Promise<{ ok: boolean; entry: CustomSourceEntry; errors: string[] }> {
  return fetchJson(`${API_BASE}/books/custom-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'subscribe', url }),
  });
}

export async function deleteCustomSource(id: string): Promise<void> {
  await fetch(`${API_BASE}/books/custom-sources/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function toggleCustomSource(id: string): Promise<{ ok: boolean; entry: CustomSourceEntry }> {
  return fetchJson(`${API_BASE}/books/custom-sources/${encodeURIComponent(id)}/toggle`, { method: 'PUT' });
}

// ── 认证 ───────────────────────────────────────────────────

export interface AuthUser {
  username: string;
  role: 'owner' | 'admin' | 'user';
}

export async function login(username: string, password: string): Promise<{ ok: boolean; user: AuthUser }> {
  return fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
}

export async function getMe(): Promise<{ user: AuthUser }> {
  return fetchJson(`${API_BASE}/auth/me`);
}

// ── 用户管理（仅 owner）────────────────────────────────────

export interface ManagedUser {
  username: string;
  role: 'owner' | 'admin' | 'user';
  fromEnv?: boolean;
  createdAt?: number;
}

export async function getUsers(): Promise<{ users: ManagedUser[] }> {
  return fetchJson(`${API_BASE}/auth/admin/users`);
}

export async function createUser(username: string, password: string, role: 'admin' | 'user' = 'user'): Promise<{ ok: boolean; user: ManagedUser }> {
  return fetchJson(`${API_BASE}/auth/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
}

export async function updateUser(username: string, data: { password?: string; role?: 'admin' | 'user' }): Promise<{ ok: boolean; user: ManagedUser }> {
  return fetchJson(`${API_BASE}/auth/admin/users/${encodeURIComponent(username)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteUser(username: string): Promise<void> {
  await fetch(`${API_BASE}/auth/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
}
