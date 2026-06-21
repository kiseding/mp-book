import { BookOpen, Compass, Library, Moon, Search, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useThemeStore } from '../stores/app';

const tabs = [
  { href: '/', label: '发现', icon: Compass },
  { href: '/search', label: '搜索', icon: Search },
  { href: '/shelf', label: '书架', icon: Library },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useThemeStore();

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-900 dark:from-gray-950 dark:via-gray-950 dark:to-emerald-950 dark:text-gray-100">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-emerald-100/80 bg-white/85 shadow-sm backdrop-blur-xl dark:border-emerald-500/10 dark:bg-gray-950/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-500/10"
          >
            <span className="sr-only">返回</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-emerald-700 dark:text-emerald-300">
            <BookOpen className="h-6 w-6" />
            mp-book
          </Link>
          <div className="flex-1" />
          <button
            onClick={toggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-300 dark:hover:bg-emerald-500/10"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {tabs.map((tab) => {
              const active = location.pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-300 dark:hover:bg-emerald-500/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-emerald-100/80 bg-white/95 shadow-[0_-12px_32px_rgba(6,95,70,0.08)] backdrop-blur-xl dark:border-emerald-500/10 dark:bg-gray-950/95 md:hidden">
        {tabs.map((tab) => {
          const active = location.pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10 ${
                active ? 'font-semibold text-emerald-600 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
