import { Link } from 'react-router-dom';
import { BookOpen, Clock, Trash2 } from 'lucide-react';
import { Empty } from '../components/ui/Empty';
import { useHistoryStore, useShelfStore } from '../stores/app';
import { proxyUrl } from '../utils';

export function Shelf() {
  const { items, removeItem } = useShelfStore();
  const { records, removeRecord } = useHistoryStore();
  const shelfList = Object.values(items).sort((a, b) => b.saveTime - a.saveTime);
  const historyList = Object.values(records).sort((a, b) => b.saveTime - a.saveTime);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">我的书架</h2>
        </div>
        {shelfList.length === 0 ? (
          <Empty message="书架是空的，去发现页逛逛吧" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {shelfList.map((item) => (
              <article
                key={`${item.sourceId}-${item.bookId}`}
                className="group overflow-hidden rounded-[1.75rem] border border-emerald-100/80 bg-white/85 shadow-sm dark:border-emerald-500/10 dark:bg-gray-950/70"
              >
                <Link to={`/detail?sourceId=${encodeURIComponent(item.sourceId)}&href=${encodeURIComponent(item.detailHref || '')}`} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-gray-900 dark:to-emerald-950/20">
                    {item.cover ? (
                      <img src={proxyUrl(item.cover)} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                        <BookOpen className="h-8 w-8" />
                        无封面
                      </div>
                    )}
                  </div>
                </Link>
                <div className="space-y-2 p-3.5">
                  <Link
                    to={`/detail?sourceId=${encodeURIComponent(item.sourceId)}&href=${encodeURIComponent(item.detailHref || '')}`}
                    className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950 dark:text-white"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.author || '未知作者'}</span>
                    <button
                      onClick={() => removeItem(`${item.sourceId}::${item.bookId}`)}
                      className="rounded-full p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">阅读历史</h2>
        </div>
        {historyList.length === 0 ? (
          <Empty message="还没有阅读记录" />
        ) : (
          <div className="space-y-3">
            {historyList.slice(0, 20).map((record) => (
              <div
                key={`${record.sourceId}-${record.bookId}`}
                className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white/80 p-4 dark:border-emerald-500/10 dark:bg-gray-950/70"
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                  {record.cover ? (
                    <img src={proxyUrl(record.cover)} alt={record.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="h-5 w-5 text-emerald-300 dark:text-emerald-700" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/read?sourceId=${encodeURIComponent(record.sourceId)}&href=${encodeURIComponent(record.detailHref || '')}`}
                    className="truncate text-sm font-semibold text-slate-950 dark:text-white"
                  >
                    {record.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(record.saveTime).toLocaleDateString()}
                    </span>
                    <span>进度 {record.progressPercent}%</span>
                    {record.chapterTitle && <span className="truncate">{record.chapterTitle}</span>}
                  </div>
                </div>
                <button
                  onClick={() => removeRecord(`${record.sourceId}::${record.bookId}`)}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
