import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, List, ChevronDown } from 'lucide-react';
import { getReadManifest, postReadManifest, getLegadoChapters, getChapterContent, getBookDetail } from '../api';
import { EpubReader } from '../components/reader/EpubReader';
import { PdfReader } from '../components/reader/PdfReader';
import { Spinner } from '../components/ui/Spinner';
import { saveReadRecord } from '../stores/app';
import type { BookChapter, BookChapterContent, BookReadManifest, BookReadRecord } from '../types';

export function Read() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sourceId = params.get('sourceId') || '';
  const href = params.get('href') || '';
  const acquisitionHref = params.get('acquisitionHref') || '';
  const tocHrefParam = params.get('tocHref') || '';

  const [manifest, setManifest] = useState<BookReadManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Legado 章节阅读状态
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [currentContent, setCurrentContent] = useState<BookChapterContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);

  // ── 阶段 1：根据参数模式确定加载策略 ──────────────
  useEffect(() => {
    if (!sourceId || (!href && !acquisitionHref)) {
      setError('缺少必要参数');
      setLoading(false);
      return;
    }

    // 模式 A：tocHref 参数 → 直接加载章节正文（从详情页点击章节进入）
    if (tocHrefParam) {
      setLoading(false); // 不阻塞 UI，通过 loadingContent 显示加载状态
      loadChapterDirectly(sourceId, href, tocHrefParam);
      return;
    }

    // 模式 B：标准模式 → 先加载 manifest
    setLoading(true);
    const promise = acquisitionHref && !href
      ? postReadManifest({ sourceId, href: acquisitionHref, acquisitionHref })
      : getReadManifest(sourceId, href);
    promise
      .then((m) => {
        setManifest(m);
        // 如果是章节格式，异步拉取章节列表
        if (m.chaptersUrl) {
          const url = new URL(m.chaptersUrl, window.location.origin);
          const toc = url.searchParams.get('tocHref');
          if (toc) {
            getLegadoChapters(sourceId, toc).then(setChapters).catch(() => {});
          }
        }
      })
      .catch((err) => setError(err.message || '加载阅读内容失败'))
      .finally(() => setLoading(false));
  }, [sourceId, href, acquisitionHref, tocHrefParam]);

  // ── 模式 A 辅助：直接加载章节正文 ──────────────────
  const loadChapterDirectly = async (sid: string, chHref: string, toc: string) => {
    setLoadingContent(true);
    try {
      const content = await getChapterContent(sid, chHref, toc);
      setCurrentContent(content);

      // 加载章节列表供侧栏导航
      getLegadoChapters(sid, toc).then(setChapters).catch(() => {});

      // 创建最小 manifest（头部展示用）
      setManifest({
        book: {
          id: chHref,
          sourceId: sid,
          sourceName: sid,
          title: content.title || '阅读',
          author: '',
          acquisitionLinks: [],
        },
        format: 'chapters',
        acquisitionHref: toc,
      });
    } catch {
      // 直接加载失败，回退：尝试把 href 当作 detail URL 获取详情
      try {
        const detail = await getBookDetail(sid, chHref);
        const tocLink = detail.acquisitionLinks?.find((l) => l.rel === 'legado:chapters');
        const tocUrl = tocLink?.href || toc;
        setManifest({
          book: detail,
          format: 'chapters',
          chaptersUrl: tocUrl ? `/api/books/chapters?sourceId=${encodeURIComponent(sid)}&tocHref=${encodeURIComponent(tocUrl)}` : undefined,
          acquisitionHref: tocUrl,
        });
        if (tocUrl) {
          getLegadoChapters(sid, tocUrl).then(setChapters).catch(() => {});
        }
      } catch {
        setError('无法加载章节内容');
      }
    } finally {
      setLoadingContent(false);
    }
  };

  // ── 章节间导航 ─────────────────────────────────────
  const doNavigateToChapter = useCallback((chapterHref: string) => {
    const toc = tocHrefParam || manifest?.acquisitionHref || '';
    const q = new URLSearchParams({ sourceId, href: chapterHref });
    if (toc) q.set('tocHref', toc);
    navigate(`/read?${q.toString()}`, { replace: true });
  }, [sourceId, tocHrefParam, manifest, navigate]);

  const goPrevChapter = () => {
    if (!currentContent?.previousHref) return;
    doNavigateToChapter(currentContent.previousHref);
  };

  const goNextChapter = () => {
    if (!currentContent?.nextHref) return;
    doNavigateToChapter(currentContent.nextHref);
  };

  // ── 阅读进度 ────────────────────────────────────────
  const handleProgress = (locator: BookReadRecord['locator'], percent: number) => {
    if (!manifest) return;
    saveReadRecord(manifest, { value: locator.value, type: locator.type, chapterTitle: locator.chapterTitle, percent });
  };

  // ── 加载中 ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  // ── 错误 ────────────────────────────────────────────
  if (error || !manifest) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-500/20 dark:bg-red-950/20">
        <p>{error || '无法加载书籍'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm underline">返回</button>
      </div>
    );
  }

  // ── EPUB 阅读器 ─────────────────────────────────────
  if (manifest.format === 'epub' && manifest.fileUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
        <ReaderHeader manifest={manifest} sourceId={sourceId} href={href} navigate={navigate} />
        <div className="flex-1 overflow-hidden">
          <EpubReader manifest={manifest} onProgress={handleProgress} />
        </div>
      </div>
    );
  }

  // ── PDF 阅读器 ──────────────────────────────────────
  if (manifest.format === 'pdf' && manifest.fileUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
        <ReaderHeader manifest={manifest} sourceId={sourceId} href={href} navigate={navigate} />
        <div className="flex-1 overflow-hidden">
          <PdfReader manifest={manifest} onProgress={handleProgress} />
        </div>
      </div>
    );
  }

  // ── Legado 章节阅读器 ──────────────────────────────
  if (manifest.format === 'chapters') {
    // 子模式 A：没有 tocHref 参数 → 显示章节列表（第一次进入阅读）
    if (!tocHrefParam && !currentContent) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
          <ReaderHeader manifest={manifest} sourceId={sourceId} href={href} navigate={navigate} />
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="mb-4 text-lg font-bold text-slate-950 dark:text-white">
              章节列表
              <span className="ml-2 text-sm font-normal text-slate-500">共 {chapters.length} 章</span>
            </h2>
            {chapters.length === 0 ? (
              <div className="flex justify-center py-12 text-slate-500">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <div className="divide-y divide-emerald-100 dark:divide-emerald-500/10">
                {chapters.map((ch, i) => (
                  <button
                    key={ch.id}
                    onClick={() => doNavigateToChapter(ch.href)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {i + 1}
                    </span>
                    <span className="line-clamp-1 text-slate-700 dark:text-slate-300">{ch.title}</span>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // 子模式 B：显示章节正文
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
        {/* 顶部导航 */}
        <header className="flex h-14 items-center gap-3 border-b border-emerald-100 bg-white/90 px-4 shadow-sm backdrop-blur dark:border-emerald-500/10 dark:bg-gray-950/90">
          <button
            onClick={() => {
              // 回到章节列表（无 tocHrefParam 即列表模式）
              const backSearch = new URLSearchParams({ sourceId, href: manifest.book.id || href });
              navigate(`/read?${backSearch.toString()}`, { replace: true });
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-950 dark:text-white">
              {currentContent?.title || manifest.book.title}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{manifest.book.author}</div>
          </div>
          <button
            onClick={() => setShowChapterList((v) => !v)}
            className="rounded-full p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            title="章节列表"
          >
            <List className="h-5 w-5" />
          </button>
        </header>

        {/* 正文区域 */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* 章节列表侧栏 */}
          {showChapterList && (
            <div className="absolute inset-y-0 left-0 z-20 w-72 overflow-y-auto border-r border-emerald-100 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-emerald-500/10 dark:bg-gray-950/95">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">目录</h3>
                <button onClick={() => setShowChapterList(false)} className="rounded-full p-1 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      doNavigateToChapter(ch.href);
                      setShowChapterList(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      ch.href === currentContent?.href
                        ? 'bg-emerald-100 font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                        : 'text-slate-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-500/10'
                    }`}
                  >
                    {ch.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 正文 */}
          {loadingContent ? (
            <div className="flex w-full items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : currentContent ? (
            <div className="flex w-full flex-col">
              <div
                className="flex-1 overflow-y-auto px-6 py-8 text-base leading-8 text-slate-800 dark:text-slate-200"
                style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}
              >
                {currentContent.content.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  if (/^<img\b/.test(trimmed)) {
                    return <div key={i} className="my-4 flex justify-center" dangerouslySetInnerHTML={{ __html: trimmed }} />;
                  }
                  if (/^<[^>]+>/.test(trimmed)) {
                    return <div key={i} className="mb-3" dangerouslySetInnerHTML={{ __html: trimmed }} />;
                  }
                  return <p key={i} className="mb-3 text-justify indent-2">{trimmed}</p>;
                })}
                <div className="h-8" />
              </div>
              {/* 前后章导航 */}
              <div className="sticky bottom-0 flex items-center justify-between border-t border-emerald-100 bg-white/95 px-6 py-3 backdrop-blur dark:border-emerald-500/10 dark:bg-gray-950/95">
                <button
                  onClick={goPrevChapter}
                  disabled={!currentContent.previousHref}
                  className="inline-flex items-center gap-1 rounded-2xl px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-emerald-500/10"
                >
                  <ChevronLeft className="h-4 w-4" /> 上一章
                </button>
                <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">
                  {currentContent.title}
                </span>
                <button
                  onClick={goNextChapter}
                  disabled={!currentContent.nextHref}
                  className="inline-flex items-center gap-1 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-30"
                >
                  下一章 <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center text-slate-500 dark:text-slate-400">
              正在加载章节内容...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 不支持格式 ──────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
      <ReaderHeader manifest={manifest} sourceId={sourceId} href={href} navigate={navigate} />
      <div className="flex flex-1 items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <p>无法在线阅读此格式</p>
          {manifest.acquisitionHref && (
            <a href={manifest.acquisitionHref} target="_blank" rel="noreferrer" className="mt-2 inline-block text-emerald-600 underline">
              直接下载
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 通用阅读器顶部栏 ──────────────────────────────────
function ReaderHeader({
  manifest,
  sourceId,
  href,
  navigate,
}: {
  manifest: BookReadManifest;
  sourceId: string;
  href: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-emerald-100 bg-white/90 px-4 shadow-sm backdrop-blur dark:border-emerald-500/10 dark:bg-gray-950/90">
      <button
        onClick={() => navigate(`/detail?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(href)}`)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-slate-950 dark:text-white">{manifest.book.title}</div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">{manifest.book.author}</div>
      </div>
    </header>
  );
}
