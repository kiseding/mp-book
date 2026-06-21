import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCatalog } from '../api';
import { BookCard } from '../components/BookCard';
import { Empty } from '../components/ui/Empty';
import { Spinner } from '../components/ui/Spinner';
import type { BookCatalogResult } from '../types';

export function Catalog() {
  const [params, setParams] = useSearchParams();
  const sourceId = params.get('sourceId') || '';
  const href = params.get('href') || undefined;

  const [catalog, setCatalog] = useState<BookCatalogResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sourceId) {
      setError('缺少书源 ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    getCatalog(sourceId, href)
      .then(setCatalog)
      .catch((err) => setError(err.message || '加载目录失败'))
      .finally(() => setLoading(false));
  }, [sourceId, href]);

  const navigateHref = (nextHref?: string) => {
    if (!nextHref || !sourceId) return;
    const next = new URLSearchParams({ sourceId, href: nextHref });
    setParams(next);
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/20">{error}</div>}

      {!loading && !error && catalog && (
        <>
          <div className="rounded-[2rem] border border-emerald-100 bg-white/80 p-6 shadow-sm dark:border-emerald-500/10 dark:bg-gray-950/70">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{catalog.title}</h1>
            {catalog.subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{catalog.subtitle}</p>}
          </div>

          {catalog.navigation.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {catalog.navigation.map((nav) => (
                <button
                  key={nav.href}
                  onClick={() => navigateHref(nav.href)}
                  className="rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-gray-950/50 dark:text-emerald-100"
                >
                  {nav.title}
                </button>
              ))}
            </div>
          )}

          {catalog.entries.length === 0 && <Empty message="该目录下暂无书籍" />}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {catalog.entries.map((item) => (
              <BookCard
                key={`${item.sourceId}-${item.id}`}
                item={item}
                to={`/detail?sourceId=${encodeURIComponent(item.sourceId)}&href=${encodeURIComponent(item.detailHref || '')}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-4">
            {catalog.previousHref ? (
              <button onClick={() => navigateHref(catalog.previousHref)} className="inline-flex items-center gap-1 rounded-2xl px-4 py-2 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                <ChevronLeft className="h-4 w-4" /> 上一页
              </button>
            ) : (
              <div />
            )}
            {catalog.nextHref && (
              <button onClick={() => navigateHref(catalog.nextHref)} className="inline-flex items-center gap-1 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                下一页 <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
