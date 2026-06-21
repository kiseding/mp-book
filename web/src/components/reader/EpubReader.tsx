import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import { ChevronLeft, ChevronRight, Maximize, Minus, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import type { BookReadManifest } from '../../types';

interface EpubReaderProps {
  manifest: BookReadManifest;
  onProgress: (locator: { value: string; type: 'epub-cfi'; chapterTitle?: string }, percent: number) => void;
}

export function EpubReader({ manifest, onProgress }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<ReturnType<ReturnType<typeof ePub>['renderTo']> | null>(null);
  const [toc, setToc] = useState<{ label: string; href: string }[]>([]);
  const [fontSize, setFontSize] = useState(18);
  const [showToc, setShowToc] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!viewerRef.current || !manifest.fileUrl) return;

    const book = ePub(manifest.fileUrl);
    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
    });
    renditionRef.current = rendition;

    book.loaded.navigation.then((nav) => {
      setToc(
        (nav.toc || []).map((item: { label?: string; href?: string }) => ({
          label: item.label || '未命名章节',
          href: item.href || '',
        }))
      );
    });

    rendition.on('relocated', (location: { start: { cfi: string; displayed?: { page: number; total: number } }; end: { cfi: string } }) => {
      const percent = Math.round((location.start.displayed?.page || 1) / (location.start.displayed?.total || 1) * 100);
      onProgress({ value: location.start.cfi, type: 'epub-cfi' }, percent);
    });

    rendition.themes.fontSize(`${fontSize}px`);
    rendition.display().catch((err: Error) => setError(err.message));

    return () => {
      rendition.destroy();
      book.destroy();
    };
  }, [manifest.fileUrl]);

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSize}px`);
  }, [fontSize]);

  const prev = () => renditionRef.current?.prev();
  const next = () => renditionRef.current?.next();
  const goTo = (href: string) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  };

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-red-600 dark:text-red-400">
        <p>EPUB 加载失败: {error}</p>
        <Button onClick={() => window.open(manifest.fileUrl, '_blank')}>新窗口打开</Button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-emerald-100 bg-white/80 px-4 py-2 dark:border-emerald-500/10 dark:bg-gray-950/80">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowToc((v) => !v)} className="rounded-xl px-3 py-1.5 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            目录
          </button>
          <button onClick={() => setFontSize((v) => Math.max(12, v - 2))} className="rounded-xl p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums">{fontSize}px</span>
          <button onClick={() => setFontSize((v) => Math.min(32, v + 2))} className="rounded-xl p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="rounded-xl p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} className="rounded-xl p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={() => viewerRef.current?.requestFullscreen()} className="rounded-xl p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {showToc && (
          <div className="absolute inset-y-0 left-0 z-20 w-64 overflow-y-auto border-r border-emerald-100 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-emerald-500/10 dark:bg-gray-950/95">
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">目录</h3>
            <ul className="space-y-1">
              {toc.map((item) => (
                <li key={item.href}>
                  <button
                    onClick={() => goTo(item.href)}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-500/10"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div ref={viewerRef} className="flex-1" />
      </div>
    </div>
  );
}
