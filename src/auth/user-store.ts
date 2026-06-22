/**
 * 用户存储
 *
 * 将用户数据持久化到 KV，支持多用户管理。
 * 超级管理员（由 USERNAME/PASSWORD 环境变量定义）始终存在，不存 KV。
 * 其他用户通过管理后台创建，存储在 KV 中。
 */

// ── 类型 ────────────────────────────────────────────────

export interface StoredUser {
  username: string;
  /** SHA-256 hex hash of password */
  passwordHash: string;
  role: 'owner' | 'admin' | 'user';
  createdAt: number;
  updatedAt: number;
}

// ── 常量 ────────────────────────────────────────────────

const KV_KEY = 'mp-book:users';
const CACHE_TTL_MS = 60_000;

// ── 内存状态 ────────────────────────────────────────────

let _kv: KVNamespace | null = null;
let _cache: { data: StoredUser[]; ts: number } | null = null;
/** 纯内存后备存储 */
let _store: StoredUser[] = [];

// ── 密码工具 ────────────────────────────────────────────

const encoder = new TextEncoder();

async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── 内部读写 ────────────────────────────────────────────

export function setKvBinding(kv: KVNamespace | null) {
  _kv = kv;
  if (!kv) _cache = null;
}

async function readAll(): Promise<StoredUser[]> {
  if (_kv && _cache && Date.now() - _cache.ts < CACHE_TTL_MS) return _cache.data;
  if (_kv) {
    try {
      const raw = await _kv.get(KV_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredUser[];
        if (Array.isArray(parsed)) {
          _cache = { data: parsed, ts: Date.now() };
          return parsed;
        }
      }
    } catch { /* fall through */ }
    _cache = { data: [], ts: Date.now() };
    return [];
  }
  return _store;
}

async function writeAll(users: StoredUser[]) {
  if (_kv) {
    try {
      await _kv.put(KV_KEY, JSON.stringify(users));
      _cache = { data: users, ts: Date.now() };
    } catch { /* keep memory */ }
  }
  _store = users;
}

// ── 公开方法 ────────────────────────────────────────────

export async function getAllUsers(): Promise<StoredUser[]> {
  return readAll();
}

export async function getUser(username: string): Promise<StoredUser | undefined> {
  const users = await readAll();
  return users.find((u) => u.username === username);
}

export async function createUser(username: string, password: string, role: 'owner' | 'admin' | 'user' = 'user'): Promise<StoredUser> {
  if (!username.trim()) throw new Error('用户名不能为空');
  if (password.length < 4) throw new Error('密码长度至少 4 位');
  const users = await readAll();
  if (users.find((u) => u.username === username)) throw new Error('用户已存在');
  const now = Date.now();
  const user: StoredUser = {
    username: username.trim(),
    passwordHash: await hashPassword(password),
    role,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await writeAll(users);
  return user;
}

export async function updateUser(username: string, data: { password?: string; role?: 'owner' | 'admin' | 'user' }): Promise<StoredUser> {
  const users = await readAll();
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error('用户不存在');
  if (data.password) {
    if (data.password.length < 4) throw new Error('密码长度至少 4 位');
    user.passwordHash = await hashPassword(data.password);
  }
  if (data.role) user.role = data.role;
  user.updatedAt = Date.now();
  await writeAll(users);
  return user;
}

export async function deleteUser(username: string): Promise<boolean> {
  const users = await readAll();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) return false;
  users.splice(idx, 1);
  await writeAll(users);
  return true;
}

export async function validatePassword(username: string, password: string): Promise<StoredUser | null> {
  const users = await readAll();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return null;
  return user;
}
