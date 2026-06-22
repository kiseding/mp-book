import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  username: string;
  role: 'owner' | 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  _checked: boolean; // session-only, 不 persist
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      _checked: false,

      checkAuth: async () => {
        // 已经验证过且是 authenticated，跳过（避免每次加载都闪一下 /login）
        if (get()._checked) return;
        set({ loading: true });
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json() as { user: User };
            set({ user: data.user, isAuthenticated: true, loading: false, error: null, _checked: true });
          } else {
            // cookie 过期或无效，清除持久化的登录状态
            set({ user: null, isAuthenticated: false, loading: false, error: null, _checked: true });
          }
        } catch {
          set({ user: null, isAuthenticated: false, loading: false, error: null, _checked: true });
        }
      },

      login: async (username: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || '登录失败');
          }
          set({ user: data.user, isAuthenticated: true, loading: false, error: null });
        } catch (e) {
          set({ loading: false, error: (e as Error).message || '登录失败' });
          throw e;
        }
      },

      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch { /* ignore */ }
        set({ user: null, isAuthenticated: false, loading: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'mp-book-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
