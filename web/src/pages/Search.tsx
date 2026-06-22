import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookMarked,
  ChevronDown,
  ChevronUp,
  Layers3,
  Loader2,
  Search as SearchIcon,
  Sparkles,
} from 'lucide-react';
import { searchBooks } from '../api';
import { BookCard } from '../components/BookCard';
import { Button } from '../components/ui/Button';
import { Empty } from '../components/ui/Empty';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import type { BookListItem, BookSearchFailure, BookSource } from '../types';

const QUICK_SEARCHES = ['三体', '刘慈欣', '东野圭吾', '哈利波特'];

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[1.75rem] border border-emerald-100/70 bg-white/70 p-3 shadow-sm dark:border-emerald-500/10 dark:bg-gray-950/50">
          <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-gray-800 dark:to-emerald-950/30" />
          <div className="mt-3 h-4 w-3/4 rounded bg-emerald-100 dark:bg-gray-800" />
          <div className="mt-2 h-3 w-1/2 rounded bg-emerald-100/80 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export function Search() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') || '';
  const initialSource = params.get('sourceId') || '';

  const [q, setQ] = useState(initialQ);
  const [sourceId, setSourceId] = useState(initialSource);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BookListItem[]>([]);
  const [failed, setFailed] = useState<BookSearchFailure[]>([]);
  const [showFailed, setShowFailed] = useState(false);
  const [sources, setSources] = useState<BookSource[]>([]);
  const [totalSources, setTotalSources] = useState(0);
  const [completedSources, setCompletedSources] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const searchKeyRef = useRef('');

  // 加载书源列表
  useEffect(() => {
    fetch('/api/books/sources')
      .then((r) => r.json())
      .then((d) => setSources(d.sources || []))
      .catch(() => {});
  }, []);

  // 清理 EventSource
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // 初始搜索
  useEffect(() => {
    if (!initialQ) return;
    doSearch(initialQ, initialSource || undefined);
  }, [initialQ, initialSource]);

  const selectedSourceName = sourceId
    ? sources.find((s) => s.id === sourceId)?.name || '当前书源'
    : '全部书源';

  const searchProgress = totalSources > 0
    ? Math.min(100, Math.round((completedSources / totalSources) * 100))
    : 0;

  function doSearch(keyword: string, specificSource?: string) {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    // 清理旧连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const searchKey = `${specificSource || ''}::${trimmed}`;
    searchKeyRef.current = searchKey;

    setLoading(true);
    setResults([]);
    setFailed([]);
    setTotalSources(0);
    setCompletedSources(0);

    // 使用 SSE 流式搜索（支持 EventSource 的浏览器）
    const params = new URLSearchParams({ q: trimmed });
    if (specificSource) params.set('sourceId', specificSource);

    try {
      const es = new EventSource(`/api/books/search/stream?${params.toString()}`);
      eventSourceRef.current = es;

      es.addEventListener('start', (e) => {
        if (searchKeyRef.current !== searchKey) return;
        try {
          const data = JSON.parse(e.data);
          setTotalSources(data.totalSources || 0);
        } catch { /* ignore */ }
      });

      es.addEventListener('source_result', (e) => {
        if (searchKeyRef.current !== searchKey) return;
        try {
          const data = JSON.parse(e.data);
          setCompletedSources(data.completedSources || 0);
          if (Array.isArray(data.results) && data.results.length > 0) {
            setResults((prev) => [...prev, ...data.results]);
          }
        } catch { /* ignore */ }
      });

      es.addEventListener('source_error', (e) => {
        if (searchKeyRef.current !== searchKey) return;
        try {
          const data = JSON.parse(e.data);
          setCompletedSources(data.completedSources || 0);
          if (data.sourceName) {
            setFailed((prev) => [
              ...prev,
              { sourceId: data.sourceId || '', sourceName: data.sourceName, error: data.error || '搜索失败' },
            ]);
          }
        } catch { /* ignore */ }
      });

      es.addEventListener('complete', () => {
        if (searchKeyRef.current !== searchKey) return;
        setLoading(false);
        es.close();
        eventSourceRef.current = null;
      });

      es.addEventListener('error', () => {
        // SSE 连接出错或关闭
        if (searchKeyRef.current !== searchKey) return;
        setLoading(false);
        es.close();
        eventSourceRef.current = null;
      });
    } catch {
      // 不支持 EventSource，降级到普通 fetch
      fallbackSearch(trimmed, specificSource);
    }
  }

  async function fallbackSearch(keyword: string, specificSource?: string) {
    try {
      const res = await searchBooks(keyword, specificSource || undefined);
      setResults(res.results || []);
      setFailed(res.failedSources || []);
      setTotalSources(1);
      setCompletedSources(1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (sourceId) next.set('sourceId', sourceId);

    // 如果关键词没变，强制刷新
    if (q.trim() === initialQ && sourceId === initialSource) {
      doSearch(q.trim(), sourceId || undefined);
    } else {
      setParams(next);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-sm dark:border-emerald-500/10 dark:from-emerald-950/30 dark:via-gray-950 dark:to-amber-950/20 sm:p-7">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/10" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/75 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-500/20 dark:bg-gray-950/50 dark:text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            搜索书籍
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-5xl">
                找到下一本书
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_SEARCHES.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => {
                      setQ(keyword);
                      const next = new URLSearchParams();
                      next.set('q', keyword);
                      if (sourceId) next.set('sourceId', sourceId);
                      setParams(next);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-gray-950/50 dark:text-emerald-100 dark:hover:bg-emerald-500/10"
                  >
                    <SearchIcon className="h-3.5 w-3.5" />
                    {keyword}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="w-full lg:w-auto">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="输入书名、作者关键词..."
                  className="flex-1 min-w-[200px]"
                />
                <Input
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  placeholder="指定 sourceId（可选）"
                  className="sm:w-44"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
                  {loading ? '搜索中' : '搜索'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 搜索状态栏 */}
      {initialQ && (
        <div className="rounded-2xl border border-emerald-100/80 bg-white/75 p-4 shadow-sm dark:border-emerald-500/10 dark:bg-gray-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                <BookMarked className="h-4 w-4" />
                搜索结果
              </div>
              <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                {loading
                  ? '搜索中...'
                  : results.length > 0
                    ? `找到 ${results.length} 本书`
                    : '未找到匹配书籍'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                当前范围：{selectedSourceName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                <Layers3 className="h-3.5 w-3.5" />
                {sources.length} 个书源
              </span>
              {loading && totalSources > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  搜索中 {completedSources}/{totalSources}
                </span>
              )}
            </div>
          </div>
          {/* 进度条 */}
          {loading && totalSources > 0 && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-50 dark:bg-gray-900">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                style={{ width: `${searchProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {loading && results.length === 0 && <SearchSkeleton />}

      {failed.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-950/20">
          <button
            onClick={() => setShowFailed(!showFailed)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {failed.length} 个书源搜索失败
            </span>
            {showFailed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showFailed && (
            <ul className="border-t border-amber-200/60 px-4 pb-3 pt-2 text-xs space-y-1.5 pl-10 list-disc text-amber-700 dark:border-amber-500/10 dark:text-amber-400">
              {failed.map((f) => (
                <li key={f.sourceId}>
                  <span className="font-medium">{f.sourceName}</span>: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && initialQ && results.length === 0 && failed.length === 0 && (
        <Empty icon={SearchIcon} title="未找到相关书籍" description="试试其他关键词或书源" />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {results.map((item) => (
          <BookCard
            key={`${item.sourceId}-${item.id}`}
            item={item}
            to={item.detailHref
              ? `/detail?sourceId=${encodeURIComponent(item.sourceId)}&href=${encodeURIComponent(item.detailHref)}`
              : undefined}
          />
        ))}
      </div>
    </div>
  );
}
