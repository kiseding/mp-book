/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 认证工具函数
 *
 * 基于 moontvplus 的 auth.ts + middleware-auth.ts 移植到 Hono + Workers。
 *
 * Token 使用 HMAC-SHA256 签名，存储在 auth cookie 中。
 * 格式：URI-encoded JSON { username, role, timestamp, signature, tokenId, refreshToken, refreshExpires }
 */

// ── 类型 ────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'user';

export interface AuthToken {
  username: string;
  role: UserRole;
  timestamp: number;
  signature: string;
  tokenId: string;
  refreshToken: string;
  refreshExpires: number;
}

export interface AuthInfo {
  username: string;
  role: UserRole;
}

// ── 常量 ────────────────────────────────────────────────

const ACCESS_TOKEN_AGE = 24 * 60 * 60 * 1000; // 24 小时
const REFRESH_TOKEN_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天
const RENEWAL_THRESHOLD = 60 * 60 * 1000; // 到期前 1 小时内自动续期

// ── 加密工具 ────────────────────────────────────────────

const encoder = new TextEncoder();

async function deriveKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** 对 payload 进行 HMAC-SHA256 签名，返回 hex 字符串 */
export async function signPayload(payload: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 验证 HMAC-SHA256 签名 */
export async function verifySignature(payload: string, signature: string, password: string): Promise<boolean> {
  const key = await deriveKey(password);
  const sig = await signPayload(payload, password);
  // 恒定时间比较
  if (sig.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

function hex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 生成随机 tokenId */
export function generateTokenId(): string {
  return hex(16);
}

/** 生成随机 refreshToken */
export function generateRefreshToken(): string {
  return hex(32);
}

// ── Token 创建与验证 ────────────────────────────────────

/** 构建签名用的 payload 字符串 */
function buildPayload(token: AuthToken): string {
  return `${token.username}:${token.role}:${token.timestamp}:${token.tokenId}:${token.refreshToken}:${token.refreshExpires}`;
}

/** 创建新的 AuthToken */
export async function createAuthToken(username: string, role: UserRole, password: string): Promise<AuthToken> {
  const now = Date.now();
  const token: AuthToken = {
    username,
    role,
    timestamp: now,
    tokenId: generateTokenId(),
    refreshToken: generateRefreshToken(),
    refreshExpires: now + REFRESH_TOKEN_AGE,
    signature: '',
  };
  token.signature = await signPayload(buildPayload(token), password);
  return token;
}

/** 尝试验证 token，返回是否 valid */
export async function validateAuthToken(token: AuthToken, password: string): Promise<boolean> {
  if (!token.username || !token.signature) return false;
  // 检查 refresh 是否过期
  if (token.refreshExpires && token.refreshExpires < Date.now()) return false;
  return verifySignature(buildPayload(token), token.signature, password);
}

/** 是否需要续期（access token 快过期但 refresh 仍有效） */
export function shouldRenewToken(token: AuthToken): boolean {
  const age = Date.now() - token.timestamp;
  return age > ACCESS_TOKEN_AGE - RENEWAL_THRESHOLD && token.refreshExpires > Date.now();
}

/** 刷新 access token（保持 refreshToken 不变） */
export async function refreshAuthToken(token: AuthToken, password: string): Promise<AuthToken | null> {
  if (token.refreshExpires < Date.now()) return null;
  const now = Date.now();
  const renewed: AuthToken = {
    username: token.username,
    role: token.role,
    timestamp: now,
    tokenId: generateTokenId(),
    refreshToken: token.refreshToken,
    refreshExpires: token.refreshExpires,
    signature: '',
  };
  renewed.signature = await signPayload(buildPayload(renewed), password);
  return renewed;
}

// ── Cookie 序列化 / 解析 ────────────────────────────────

export function parseAuthCookie(cookieValue: string | undefined | null): AuthToken | null {
  if (!cookieValue) return null;
  let decoded = cookieValue;
  try {
    decoded = decodeURIComponent(cookieValue);
  } catch { /* ignore */ }
  if (decoded.includes('%')) {
    try { decoded = decodeURIComponent(decoded); } catch { /* ignore */ }
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === 'object' && parsed.username && parsed.signature) {
      return parsed as AuthToken;
    }
    return null;
  } catch {
    return null;
  }
}

export function serializeAuthCookie(token: AuthToken): string {
  const value = encodeURIComponent(JSON.stringify(token));
  return `auth=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(REFRESH_TOKEN_AGE / 1000)}`;
}

export function clearAuthCookie(): string {
  return 'auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}
