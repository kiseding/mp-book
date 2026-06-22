import { Context, Next } from 'hono';
import {
  parseAuthCookie,
  validateAuthToken,
  shouldRenewToken,
  refreshAuthToken,
  serializeAuthCookie,
  type AuthInfo,
  type AuthToken,
} from './auth-utils';

/**
 * 从请求中提取 AuthToken
 * 优先检查 Authorization: Bearer header，然后查 auth cookie
 */
function extractToken(c: Context): AuthToken | null {
  // 1. Authorization header
  const authHeader = c.req.header('authorization');
  if (authHeader) {
    const match = authHeader.trim().match(/^(?:Bearer|Token)\s+(.+)$/i);
    if (match) {
      const token = parseAuthCookie(match[1]);
      if (token) return token;
    }
  }

  // 2. Cookie
  const cookie = c.req.header('cookie');
  if (cookie) {
    for (const part of cookie.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith('auth=')) {
        return parseAuthCookie(trimmed.slice(5));
      }
    }
  }

  return null;
}

/**
 * Hono 认证中间件
 *
 * 保护 /api/books/* 路由，跳过 /api/auth/*。
 * 验证通过后将 { username, role } 注入 c.set('auth', ...)。
 * 在 access token 即将过期时自动续期并设置新 cookie。
 */
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const token = extractToken(c);

    if (!token) {
      return c.json({ error: 'Unauthorized', requiresAuth: true }, 401);
    }

    const password = (c.env as any)?.PASSWORD || (globalThis as any).PASSWORD || '';
    if (!password) {
      return c.json({ error: 'Server configuration error' }, 500);
    }

    const valid = await validateAuthToken(token, password);
    if (!valid) {
      return c.json({ error: 'Unauthorized', requiresAuth: true }, 401);
    }

    // 注入 auth info
    const authInfo: AuthInfo = { username: token.username, role: token.role };
    c.set('auth', authInfo);

    // 自动续期（access 即将过期但 refresh 仍有效）
    if (shouldRenewToken(token)) {
      try {
        const renewed = await refreshAuthToken(token, password);
        if (renewed) {
          c.res = new Response(null, { status: 200 }); // placeholder, will be overwritten
          c.header('Set-Cookie', serializeAuthCookie(renewed));
        }
      } catch { /* 续期失败不影响当前请求 */ }
    }

    await next();
  };
}

/** 从 Hono Context 中提取认证信息 */
export function getAuthInfo(c: Context): AuthInfo | null {
  return (c.get('auth') as AuthInfo) || null;
}
