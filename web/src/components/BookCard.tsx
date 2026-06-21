import { BookOpen, Library } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BookListItem } from '../types';

export function BookCard({ item, to }: { item: BookListItem; to?: string }) {
  const href = to || (item.detailHref
    ? `/detail?sourceId=${encodeURIComponent(item.sourceId)}&href=${encodeURIComponent(item.detailHref)}`
    : item.acquisitionLinks[0]?.href
      ? `/read?sourceId=${encodeURIComponent(item.sourceId)}&acquisitionHref=${encodeURIComponent(item.acquisitionLinks[0].href)}`
      : '/');
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-emerald-100/80 bg-white/85 shadow-sm transition-colors hover:border-emerald-200 hover:bg-white dark:border-emerald-500/10 dark:bg-gray-950/70 dark:hover:border-emerald-500/30">
      <Link to={href} className="block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500">
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-gray-900 dark:to-emerald-950/20">
          {item.cover ? (
            <img src={item.cover} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <BookOpen className="h-8 w-8" />
              无封面
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent opacity-80" />
          <div className="absolute right-2 top-2 inline-flex max-w-[74%] items-center gap-1.5 truncate rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur">
            <Library className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.sourceName}</span>
          </div>
        </div>
      </Link>
      <div className="space-y-2 p-3.5">
        <Link to={href} className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950 transition-colors hover:text-emerald-700 dark:text-white dark:hover:text-emerald-200">
          {item.title}
        </Link>
        <div className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{item.author || '未知作者'}</div>
      </div>
    </article>
  );
}
