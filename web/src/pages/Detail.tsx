import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Bookmark, Calendar, CheckCircle2, ChevronRight, List, User } from 'lucide-react';
import { getBookDetail, getLegadoChapters, postReadManifest } from '../api';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { saveToShelf, saveToShelfFromDetail } from '../stores/app';
import { proxyUrl } from '../utils';
import type { BookChapter, BookDetail } from '../types';

export function Detail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sourceId = params.get('sourceId') || '';
  const href = params.get('href') || '';

  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [tocHref, setTocHref] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState('');

  const isLegado = detail?.acquisitionLinks?.some((l) => l.rel === 'legado:chapters');

  useEffect(() => {
    if (!sourceId || !href) {
      setError('缺少必要参数');
      setLoading(false);
      return;
    }
    setLoading(true);
    getBookDetail(sourceId, href)
      .then((d) => {
        setDetail(d);
        // 尝试加载章节列表
        const tocLink = d.acquisitionLinks?.find((l) => l.rel === 'legado:chapters');
        if (tocLink) {
          setTocHref(tocLink.href);
          setLoadingChapters(true);
          getLegadoChapters(sourceId, tocLink.href)
            .then(setChapters)
            .catch(() => {/* 静默失败 */})
            .finally(() => setLoadingChapters(false));
        }
      })
      .catch((err) => setError(err.message || '加载详情失败'))
      .finally(() => setLoading(false));
  }, [sourceId, href]);

  const startRead = async () => {
    if (!detail) return;
    try {
      const manifest = await postReadManifest({ sourceId, href });
      saveToShelf(manifest);
      navigate(`/read?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(href)}`);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const openChapter = (chapter: BookChapter) => {
    navigate(`/read?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(chapter.href)}&tocHref=${encodeURIComponent(tocHref)}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error || !detail) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/20">{error || '未找到书籍'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2.25rem] border border-emerald-100 bg-white/85 shadow-sm dark:border-emerald-500/10 dark:bg-gray-950/70">
        <div className="grid gap-6 p-6 md:grid-cols-[240px_1fr] md:p-8">
          <div className="mx-auto aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-amber-50 shadow-sm dark:from-gray-900 dark:to-emerald-950/20">
            {detail.cover ? (
              <img src={proxyUrl(detail.cover)} alt={detail.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <BookOpen className="h-12 w-12" />
                无封面
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-emerald-500">{detail.sourceName}</div>
              <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white sm:text-4xl">{detail.title}</h1>
              {detail.author && (
                <div className="mt-2 flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <User className="h-4 w-4" />
                  {detail.author}
                </div>
              )}
              {detail.updated && (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  更新于 {detail.updated}
                </div>
              )}
            </div>

            {detail.summary && (
              <div className="max-h-40 overflow-y-auto rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm leading-relaxed text-slate-700 dark:border-emerald-500/10 dark:bg-emerald-950/20 dark:text-slate-300">
                {detail.summary}
              </div>
            )}

            {detail.tags && detail.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={startRead}>
                <BookOpen className="h-4 w-4" />
                {isLegado ? '开始阅读（章节）' : '开始阅读'}
              </Button>
              <Button variant="secondary" onClick={() => saveToShelfFromDetail(detail)}>
                <Bookmark className="h-4 w-4" />
                加入书架
              </Button>
            </div>

            <div className="space-y-2 pt-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                格式: {isLegado ? '章节' : 'EPUB / PDF'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {detail.navigation && detail.navigation.length > 0 && !isLegado && (
        <div className="rounded-[2rem] border border-emerald-100 bg-white/80 p-6 dark:border-emerald-500/10 dark:bg-gray-950/70">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">相关目录</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {detail.navigation.map((nav) => (
              <Link
                key={nav.href}
                to={`/catalog?sourceId=${encodeURIComponent(sourceId)}&href=${encodeURIComponent(nav.href)}`}
                className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm transition-colors hover:bg-emerald-50 dark:border-emerald-500/10 dark:bg-gray-950/50 dark:hover:bg-emerald-950/30"
              >
                {nav.title}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {isLegado && (
        <div className="rounded-[2rem] border border-emerald-100 bg-white/80 p-6 dark:border-emerald-500/10 dark:bg-gray-950/70">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              <List className="mr-2 inline-block h-5 w-5" />
              章节列表
            </h2>
            {chapters.length > 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">共 {chapters.length} 章</span>
            )}
          </div>
          {loadingChapters ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : chapters.length > 0 ? (
            <div className="mt-4 max-h-[60vh] divide-y divide-emerald-100 overflow-y-auto dark:divide-emerald-500/10">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => openChapter(ch)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                >
                  <span className="line-clamp-1 text-slate-700 dark:text-slate-300">{ch.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">暂无章节信息</p>
          )}
        </div>
      )}
    </div>
  );
}
