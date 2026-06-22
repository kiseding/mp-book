import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  XCircle,
} from 'lucide-react';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  type ManagedUser,
} from '../api';
import { Spinner } from '../components/ui/Spinner';
import { Empty } from '../components/ui/Empty';
import { useAuthStore } from '../stores/auth';

export function UserManager() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 创建用户表单
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 修改密码
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [saving, setSaving] = useState(false);

  // 删除确认
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      setUsers(data.users);
    } catch (e) {
      setError((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setCreating(true);
    setCreateError('');
    try {
      await createUser(newUsername.trim(), newPassword, newRole);
      setShowCreate(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      await loadUsers();
    } catch (err) {
      setCreateError((err as Error).message || '创建失败');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(username: string) {
    if (!editPassword && editRole === 'user') return;
    setSaving(true);
    try {
      const data: { password?: string; role?: 'admin' | 'user' } = {};
      if (editPassword) data.password = editPassword;
      // 总是传 role 以确保正确
      data.role = editRole;
      await updateUser(username, data);
      setEditingUser(null);
      setEditPassword('');
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || '更新失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(username: string) {
    setDeletingUser(username);
    try {
      await deleteUser(username);
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || '删除失败');
      setDeletingUser(null);
    }
  }

  const canManage = currentUser?.role === 'owner';

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 dark:text-slate-400">
        <Shield className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">无管理权限</p>
        <p className="mt-1 text-sm">仅超级管理员可管理用户</p>
      </div>
    );
  }

  if (loading) return <Spinner className="py-24" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">用户管理</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {users.length} 个用户
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          {showCreate ? <XCircle className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showCreate ? '取消' : '添加用户'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 创建用户表单 */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <h3 className="mb-4 font-semibold text-emerald-800 dark:text-emerald-200">新建用户</h3>
          {createError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {createError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-4">
            <input
              type="text"
              placeholder="用户名"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
            <input
              type="password"
              placeholder="密码（至少4位）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
              minLength={4}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
            <button
              type="submit"
              disabled={creating || !newUsername.trim() || !newPassword}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      )}

      {/* 用户列表 */}
      {users.length === 0 ? (
        <Empty
          icon={User}
          title="暂无用户"
          description="点击「添加用户」创建第一个用户"
        />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.username}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-emerald-500/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">{u.username}</span>
                      {u.fromEnv && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">超级管理</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {u.role === 'owner' ? <ShieldCheck className="h-3 w-3 text-amber-500" /> : <Shield className="h-3 w-3" />}
                      {u.role === 'owner' ? '超级管理员' : u.role === 'admin' ? '管理员' : '普通用户'}
                      {!u.fromEnv && u.createdAt && (
                        <span>· 创建于 {new Date(u.createdAt).toLocaleDateString('zh-CN')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!u.fromEnv && editingUser === u.username ? (
                    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="password"
                        placeholder="新密码"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        minLength={4}
                      />
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as 'admin' | 'user')}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="user">用户</option>
                        <option value="admin">管理</option>
                      </select>
                      <button
                        onClick={() => handleSaveEdit(u.username)}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : '保存'}
                      </button>
                      <button
                        onClick={() => { setEditingUser(null); setEditPassword(''); }}
                        className="rounded-lg bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      >
                        取消
                      </button>
                    </div>
                  ) : !u.fromEnv ? (
                    <>
                      <button
                        onClick={() => { setEditingUser(u.username); setEditRole(u.role === 'admin' ? 'admin' : 'user'); setEditPassword(''); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        <Shield className="h-3 w-3" />
                        修改
                      </button>
                      <button
                        onClick={() => handleDelete(u.username)}
                        disabled={deletingUser === u.username}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                      >
                        {deletingUser === u.username ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        删除
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
