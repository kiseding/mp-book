import { BookOpen } from 'lucide-react';

export function Empty({ message = '暂无数据' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-200 bg-white/70 p-12 text-center text-slate-500 dark:border-emerald-500/20 dark:bg-gray-950/50 dark:text-slate-400">
      <BookOpen className="mb-3 h-10 w-10 text-emerald-300 dark:text-emerald-700" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
