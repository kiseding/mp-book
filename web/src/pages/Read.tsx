import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreVertical, Settings2 } from 'lucide-react';
import { getReadManifest, postReadManifest } from '../api';
import { EpubReader } from '../components/reader/EpubReader';
import { PdfReader } from '../components/reader/PdfReader';
import { Spinner } from '../components/ui/Spinner';
import { saveReadRecord } from '../stores/app';
import type { BookReadManifest, BookReadRecord } from '../types';

export function Read() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sourceId = params.get('sourceId') || '';
  const href = params.get('href') || '';
  const acquisitionHref = params.get('acquisitionHref') || '';

  const [manifest, setManifest] = useState<BookReadManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sourceId || (!href && !acquisitionHref)) {
      setError('缺少必要参数');
      setLoading(false);
      return;
    }
    setLoading(true);
    const promise = acquisitionHref && !href
      ? postReadManifest({ sourceId, href: acquisitionHref, acquisitionHref })
      : getReadManifest(sourceId, href);
    promise
      .then(setManifest)
      .catch((err) => {
        setError(err.message || '加载阅读内容失败');
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, [sourceId, href, acquisitionHref]);

  const handleProgress = (locator: BookReadRecord['locator'], percent: number) => {
    if (!manifest) return;
    saveReadRecord(manifest, { value: locator.value, type: locator.type, chapterTitle: locator.chapterTitle, percent });
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-500/20 dark:bg-red-950/20">
        <p>{error || '无法加载书籍'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm underline">
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
      <header className="flex h-14 items-center gap-3 border-b border-emerald-100 bg-white/90 px-4 shadow-sm backdrop-blur dark:border-emerald-500/10 dark:bg-gray-950/90">
        <button
          onClick={() => href ? navigate(`/detail?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(href)}`) : navigate(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-950 dark:text-white">{manifest.book.title}</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{manifest.book.author}</div>
        </div>
        <button className="rounded-full p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
          <Settings2 className="h-4 w-4" />
        </button>
        <button className="rounded-full p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
          <MoreVertical className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-hidden">
        {manifest.format === 'epub' && manifest.fileUrl && (
          <EpubReader manifest={manifest} onProgress={handleProgress} />
        )}
        {manifest.format === 'pdf' && manifest.fileUrl && (
          <PdfReader manifest={manifest} onProgress={handleProgress} />
        )}
        {manifest.format === 'chapters' && (
          <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">章节书源阅读暂不支持</div>
        )}
        {!manifest.fileUrl && manifest.format !== 'chapters' && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
            <p>无法获取在线阅读文件</p>
            {manifest.acquisitionHref && (
              <a href={manifest.acquisitionHref} target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                直接下载
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
