import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { searchBooks } from '../api';
import { BookCard } from '../components/BookCard';
import { Button } from '../components/ui/Button';
import { Empty } from '../components/ui/Empty';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import type { BookListItem, BookSearchFailure } from '../types';

export function Search() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') || '';
  const initialSource = params.get('sourceId') || '';

  const [q, setQ] = useState(initialQ);
  const [sourceId, setSourceId] = useState(initialSource);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BookListItem[]>([]);
  const [failed, setFailed] = useState<BookSearchFailure[]>([]);

  useEffect(() => {
    if (!initialQ) return;
    setLoading(true);
    searchBooks(initialQ, initialSource || undefined)
      .then((res) => {
        setResults(res.results);
        setFailed(res.failedSources);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [initialQ, initialSource]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (sourceId) next.set('sourceId', sourceId);
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-emerald-100 bg-white/80 p-6 shadow-sm dark:border-emerald-500/10 dark:bg-gray-950/70">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">搜索书籍</h1>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="输入书名、作者关键词..." className="flex-1" />
          <Input value={sourceId} onChange={(e) => setSourceId(e.target.value)} placeholder="指定 sourceId（可选）" className="sm:w-56" />
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : <SearchIcon className="h-4 w-4" />}
            搜索
          </Button>
        </form>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {!loading && initialQ && results.length === 0 && failed.length === 0 && <Empty message="未找到相关书籍" />}

      {failed.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-300">
          <div className="font-semibold">部分书源搜索失败</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {failed.map((f) => (
              <li key={f.sourceId}>
                {f.sourceName}: {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {results.map((item) => (
          <BookCard key={`${item.sourceId}-${item.id}`} item={item} to={`/detail?sourceId=${encodeURIComponent(item.sourceId)}&href=${encodeURIComponent(item.detailHref || '')}`} />
        ))}
      </div>
    </div>
  );
}
