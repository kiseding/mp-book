import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Cog, Compass, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSources } from '../api';

import { Spinner } from '../components/ui/Spinner';
import type { BookSource } from '../types';

function CapabilityPill({ enabled, children }: { enabled?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        enabled
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
          : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-400'
      }`}
    >
      {children}
    </span>
  );
}

export function Home() {
  const [sources, setSources] = useState<BookSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSources()
      .then(setSources)
      .catch((err) => setError(err.message || '加载书源失败'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const catalogCount = sources.filter((s) => s.capabilities?.catalogSupported).length;
    const searchCount = sources.filter((s) => s.capabilities?.searchSupported).length;
    return [
      { label: '可用书源', value: sources.length },
      { label: '支持目录', value: catalogCount },
      { label: '支持搜索', value: searchCount },
    ];
  }, [sources]);

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-sm dark:border-emerald-500/10 dark:from-emerald-950/30 dark:via-gray-950 dark:to-amber-950/20 sm:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-500/20 dark:bg-gray-950/50 dark:text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              mp-book Reading Library
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-6xl">
              电子书馆
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
              >
                <Search className="h-4 w-4" />
                搜索书籍
              </Link>
              <Link
                to="/shelf"
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white/70 px-5 py-3 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-gray-950/50 dark:text-emerald-100"
              >
                <BookOpen className="h-4 w-4" />
                我的书架
              </Link>
              <Link
                to="/sources"
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white/70 px-5 py-3 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-gray-950/50 dark:text-emerald-100"
              >
                <Cog className="h-4 w-4" />
                管理书源
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-white/80 bg-white/75 p-4 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
              >
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-200">{stat.value}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">书源入口</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">选择一个书源开始浏览，或直接进入搜索。</p>
        </div>
        <Compass className="hidden h-6 w-6 text-emerald-500 sm:block" />
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/20">{error}</div>}

      {!loading && !error && sources.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-200">
            <Cog className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">还没有书源</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            导入 Legado 书源或配置 OPDS 源后即可开始使用
          </p>
          <Link
            to="/sources"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
          >
            <Cog className="h-4 w-4" />
            去添加书源
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => (
          <article
            key={source.id}
            className="group relative overflow-hidden rounded-[2rem] border border-emerald-100/80 bg-white/85 p-5 shadow-sm transition-colors hover:border-emerald-200 hover:bg-white dark:border-emerald-500/10 dark:bg-gray-950/70"
          >
            <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl transition-opacity group-hover:opacity-80 dark:bg-emerald-500/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-bold text-slate-950 dark:text-white">{source.name}</div>
                <div className={`mt-1 text-xs font-medium uppercase tracking-widest ${source.type === 'legado' ? 'text-violet-500' : 'text-emerald-500'}`}>
                  {source.type === 'legado' ? 'Legado' : 'OPDS'}
                </div>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                source.type === 'legado'
                  ? 'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/20'
                  : 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20'
              }`}>
                <Compass className="h-5 w-5" />
              </div>
            </div>
            <div className="relative mt-4 flex flex-wrap gap-2">
              <CapabilityPill enabled={source.capabilities?.catalogSupported}>
                目录{source.capabilities?.catalogSupported ? '可用' : '不可用'}
              </CapabilityPill>
              <CapabilityPill enabled={source.capabilities?.searchSupported}>
                搜索{source.capabilities?.searchSupported ? '可用' : '不可用'}
              </CapabilityPill>
            </div>
            <div className="relative mt-5 flex flex-wrap gap-2">
              {source.capabilities?.catalogSupported && (
                <Link
                  to={`/catalog?sourceId=${encodeURIComponent(source.id)}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  浏览目录
                </Link>
              )}
              {source.capabilities?.searchSupported && (
                <Link
                  to={`/search?sourceId=${encodeURIComponent(source.id)}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-100"
                >
                  搜索书籍
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
