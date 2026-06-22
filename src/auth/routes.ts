import { Hono } from 'hono';
import {
  createAuthToken,
  serializeAuthCookie,
  clearAuthCookie,
  parseAuthCookie,
  validateAuthToken,
} from './auth-utils';
import { validatePassword } from './user-store';

const authRoutes = new Hono<{ Bindings: { USERNAME?: string; PASSWORD?: string } }>();

/**
 * POST /api/auth/login
 * 验证用户名密码，设置 auth cookie
 * 支持：1）超级管理员（环境变量 USERNAME/PASSWORD）；2）KV 中存储的普通用户
 */
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ error: '请输入用户名和密码' }, 400);
    }

    const expectedUsername = (c.env as any)?.USERNAME || (globalThis as any)?.USERNAME || '';
    const expectedPassword = (c.env as any)?.PASSWORD || (globalThis as any)?.PASSWORD || '';

    let role: 'owner' | 'admin' | 'user' = 'user';
    let matched = false;

    // 1) 超级管理员（环境变量）
    if (username === expectedUsername && password === expectedPassword) {
      role = 'owner';
      matched = true;
    }

    // 2) KV 存储用户
    if (!matched) {
      const storedUser = await validatePassword(username, password);
      if (storedUser) {
        role = storedUser.role;
        matched = true;
      }
    }

    if (!matched) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    const token = await createAuthToken(username, role, expectedPassword || 'fallback-secret');
    const cookie = serializeAuthCookie(token);

    return c.json(
      { ok: true, user: { username, role } },
      200,
      { 'Set-Cookie': cookie },
    );
  } catch (error) {
    return c.json({ error: (error as Error).message || '登录失败' }, 500);
  }
});

/**
 * POST /api/auth/logout
 * 清除 auth cookie
 */
authRoutes.post('/logout', (c) => {
  return c.json({ ok: true }, 200, { 'Set-Cookie': clearAuthCookie() });
});

/**
 * GET /api/auth/me
 * 返回当前登录用户信息
 */
authRoutes.get('/me', async (c) => {
  // 从 cookie 中提取
  const cookie = c.req.header('cookie') || '';
  let tokenStr = '';
  for (const part of cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('auth=')) {
      tokenStr = trimmed.slice(5);
      break;
    }
  }

  if (!tokenStr) {
    return c.json({ error: 'Not authenticated', requiresAuth: true }, 401);
  }

  const token = parseAuthCookie(tokenStr);
  if (!token) {
    return c.json({ error: 'Not authenticated', requiresAuth: true }, 401);
  }

  const password = (c.env as any)?.PASSWORD || (globalThis as any)?.PASSWORD || '';
  const valid = await validateAuthToken(token, password);
  if (!valid) {
    return c.json({ error: 'Not authenticated', requiresAuth: true }, 401);
  }

  return c.json({ ok: true, user: { username: token.username, role: token.role } });
});

export { authRoutes };
