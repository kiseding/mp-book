import { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minus, Plus } from 'lucide-react';
import type { BookReadManifest } from '../../types';

interface PdfReaderProps {
  manifest: BookReadManifest;
  onProgress: (locator: { value: string; type: 'pdf-page' }, percent: number) => void;
}

export function PdfReader({ manifest, onProgress }: PdfReaderProps) {
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [numPages, setNumPages] = useState(0);

  const handleLoad = () => {
    // 原生 iframe 无法获取页数，这里简单展示
    setNumPages(0);
  };

  const goPrev = () => {
    if (page > 1) {
      const next = page - 1;
      setPage(next);
      onProgress({ value: String(next), type: 'pdf-page' }, numPages ? Math.round((next / numPages) * 100) : 0);
    }
  };

  const goNext = () => {
    const next = page + 1;
    setPage(next);
    onProgress({ value: String(next), type: 'pdf-page' }, numPages ? Math.round((next / numPages) * 100) : 0);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-emerald-100 bg-white/80 px-4 py-2 dark:border-emerald-500/10 dark:bg-gray-950/80">
        <div className="flex items-center gap-2">
          <button onClick={() => setScale((v) => Math.max(0.5, v - 0.1))} className="rounded-xl p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((v) => Math.min(3, v + 0.1))} className="rounded-xl p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">第 {page} 页</span>
          <button onClick={goPrev} className="rounded-xl p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={goNext} className="rounded-xl p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={() => document.querySelector('.pdf-container')?.requestFullscreen()} className="rounded-xl p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="pdf-container flex flex-1 items-center justify-center overflow-auto bg-slate-100 dark:bg-black">
        {manifest.fileUrl ? (
          <iframe
            src={`${manifest.fileUrl}#page=${page}`}
            onLoad={handleLoad}
            title={manifest.book.title}
            className="h-full w-full border-0"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
          />
        ) : (
          <div className="text-slate-500 dark:text-slate-400">PDF 地址不可用</div>
        )}
      </div>
    </div>
  );
}
