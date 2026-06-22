/**
 * 管理员用户管理路由
 *
 * 仅超级管理员（owner）可管理用户。
 * 超级管理员本身（由环境变量定义）不可删除。
 */

import { Hono } from 'hono';
import { getAllUsers, createUser, updateUser, deleteUser } from './user-store';

interface AdminBindings {
  USERNAME?: string;
  PASSWORD?: string;
}

interface AdminVariables {
  auth: { username: string; role: string };
}

const adminRoutes = new Hono<{ Bindings: AdminBindings; Variables: AdminVariables }>();

/**
 * GET /api/auth/admin/users
 * 获取所有用户列表（仅返回非敏感字段）
 */
adminRoutes.get('/users', async (c) => {
  const auth = c.get('auth');
  if (!auth || auth.role !== 'owner') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const users = await getAllUsers();
  // 加上超级管理员
  const superUsername = (c.env as any)?.USERNAME || (globalThis as any)?.USERNAME || 'admin';
  const result = [
    { username: superUsername, role: 'owner' as const, fromEnv: true },
    ...users.map((u) => ({ username: u.username, role: u.role, createdAt: u.createdAt })),
  ];
  return c.json({ users: result });
});

/**
 * POST /api/auth/admin/users
 * 创建新用户
 */
adminRoutes.post('/users', async (c) => {
  const auth = c.get('auth');
  if (!auth || auth.role !== 'owner') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    const body = await c.req.json() as { username?: string; password?: string; role?: 'admin' | 'user' };
    if (!body.username || !body.password) {
      return c.json({ error: '用户名和密码不能为空' }, 400);
    }
    const user = await createUser(body.username, body.password, body.role || 'user');
    return c.json({ ok: true, user: { username: user.username, role: user.role, createdAt: user.createdAt } }, 201);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

/**
 * PUT /api/auth/admin/users/:username
 * 更新用户密码或角色
 */
adminRoutes.put('/users/:username', async (c) => {
  const auth = c.get('auth');
  if (!auth || auth.role !== 'owner') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const targetUsername = c.req.param('username');
  const superUsername = (c.env as any)?.USERNAME || (globalThis as any)?.USERNAME || '';
  if (targetUsername === superUsername) {
    return c.json({ error: '不能修改超级管理员' }, 400);
  }

  try {
    const body = await c.req.json() as { password?: string; role?: 'admin' | 'user' };
    const user = await updateUser(targetUsername, body);
    return c.json({ ok: true, user: { username: user.username, role: user.role, updatedAt: user.updatedAt } });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404);
  }
});

/**
 * DELETE /api/auth/admin/users/:username
 * 删除用户
 */
adminRoutes.delete('/users/:username', async (c) => {
  const auth = c.get('auth');
  if (!auth || auth.role !== 'owner') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const targetUsername = c.req.param('username');
  const superUsername = (c.env as any)?.USERNAME || (globalThis as any)?.USERNAME || '';
  if (targetUsername === superUsername) {
    return c.json({ error: '不能删除超级管理员' }, 400);
  }

  const ok = await deleteUser(targetUsername);
  if (!ok) return c.json({ error: '用户不存在' }, 404);
  return c.json({ ok: true });
});

export { adminRoutes };
