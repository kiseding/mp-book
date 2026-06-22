import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cog,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson,
  Link2,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getCustomSources,
  importCustomSources,
  subscribeCustomSource,
  deleteCustomSource,
  toggleCustomSource,
  type CustomSourceEntry,
} from '../api';
import { Spinner } from '../components/ui/Spinner';
import { Empty } from '../components/ui/Empty';

type Tab = 'overview' | 'import' | 'subscribe';

export function SourceManager() {
  const [entries, setEntries] = useState<CustomSourceEntry[]>([]);
  const [stats, setStats] = useState({ entries: 0, totalSources: 0, enabledSources: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ── 导入表单 ──
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; errors: string[]; name?: string } | null>(null);

  // ── 订阅表单 ──
  const [subUrl, setSubUrl] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subResult, setSubResult] = useState<{ ok: boolean; errors: string[] } | null>(null);

  // ── 删除确认 ──
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await getCustomSources();
      setEntries(data.entries);
      setStats(data.stats);
      setError('');
    } catch (err) {
      setError((err as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── 导入 JSON ──
  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importCustomSources(jsonInput.trim());
      setImportResult({
        ok: res.ok,
        errors: res.errors || [],
        name: res.entry?.sources?.[0]?.name,
      });
      if (res.ok) {
        setJsonInput('');
        await load();
      }
    } catch (err) {
      setImportResult({ ok: false, errors: [(err as Error).message] });
    } finally {
      setImporting(false);
    }
  };

  // ── 订阅 URL ──
  const handleSubscribe = async () => {
    if (!subUrl.trim()) return;
    setSubscribing(true);
    setSubResult(null);
    try {
      const res = await subscribeCustomSource(subUrl.trim());
      setSubResult({
        ok: res.ok,
        errors: res.errors || [],
      });
      if (res.ok) {
        setSubUrl('');
        await load();
      }
    } catch (err) {
      setSubResult({ ok: false, errors: [(err as Error).message] });
    } finally {
      setSubscribing(false);
    }
  };

  // ── 删除 ──
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCustomSource(id);
      await load();
    } catch (err) {
      setError((err as Error).message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  // ── 切换启用 ──
  const handleToggle = async (id: string) => {
    try {
      await toggleCustomSource(id);
      await load();
    } catch (err) {
      setError((err as Error).message || '操作失败');
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const tabClass = (tab: Tab) =>
    `inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'bg-violet-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-gray-300 dark:hover:bg-violet-500/10'
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/20">
          <Cog className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">书源管理</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">管理你的自定义 Legado 书源</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4 text-center dark:border-violet-500/10 dark:bg-gray-950/50">
          <div className="text-2xl font-black text-violet-700 dark:text-violet-200">{stats.entries}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">导入批次</div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4 text-center dark:border-violet-500/10 dark:bg-gray-950/50">
          <div className="text-2xl font-black text-violet-700 dark:text-violet-200">{stats.totalSources}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">总书源数</div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4 text-center dark:border-violet-500/10 dark:bg-gray-950/50">
          <div className="text-2xl font-black text-violet-700 dark:text-violet-200">{stats.enabledSources}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">启用中</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-violet-100 pb-3 dark:border-violet-500/10">
        <button onClick={() => setActiveTab('overview')} className={tabClass('overview')}>
          <Eye className="h-4 w-4" />
          已导入列表
        </button>
        <button onClick={() => setActiveTab('import')} className={tabClass('import')}>
          <FileJson className="h-4 w-4" />
          导入 JSON
        </button>
        <button onClick={() => setActiveTab('subscribe')} className={tabClass('subscribe')}>
          <Link2 className="h-4 w-4" />
          订阅地址
        </button>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : entries.length === 0 ? (
            <Empty message="还没有导入过自定义书源。切换到「导入 JSON」或「订阅地址」标签页添加。" />
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-2xl border bg-white/80 p-5 transition-colors dark:bg-gray-950/60 ${
                    entry.enabled
                      ? 'border-violet-100 dark:border-violet-500/10'
                      : 'border-gray-200 opacity-60 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="truncate text-base font-bold text-slate-950 dark:text-white">
                          {entry.sources[0]?.name || '未命名书源'}
                        </h3>
                        {entry.sources.length > 1 && (
                          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                            +{entry.sources.length - 1}
                          </span>
                        )}
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.source === 'subscription'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                        }`}>
                          {entry.source === 'subscription' ? '订阅' : '手动'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {entry.source === 'subscription' ? entry.raw : (
                          entry.sources.map((s) => s.url).filter(Boolean).join(', ')
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        导入时间：{formatDate(entry.addedAt)}
                      </p>
                      {entry.lastError && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          {entry.lastError}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleToggle(entry.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-500/10"
                        title={entry.enabled ? '停用' : '启用'}
                      >
                        {entry.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        title="删除"
                      >
                        {deletingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {/* Book source list */}
                  {entry.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-violet-50 pt-3 dark:border-violet-500/5">
                      {entry.sources.slice(0, 10).map((src) => (
                        <Link
                          key={src.id}
                          to={`/catalog?sourceId=${encodeURIComponent(src.id)}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-200"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {src.name}
                        </Link>
                      ))}
                      {entry.sources.length > 10 && (
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-500 dark:bg-gray-800">
                          还有 {entry.sources.length - 10} 个...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Import JSON tab */}
      {activeTab === 'import' && (
        <div className="rounded-2xl border border-violet-100 bg-white/80 p-5 dark:border-violet-500/10 dark:bg-gray-950/60">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">导入 Legado 书源 JSON</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            粘贴 Legado 书源的 JSON 内容。可以是单个书源、书源数组，或订阅格式的对象。
          </p>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={10}
            className="mt-4 w-full rounded-xl border border-violet-200 bg-white p-4 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-violet-500/20 dark:bg-gray-900 dark:text-gray-100"
            placeholder={`[\n  {\n    "bookSourceName": "示例书源",\n    "bookSourceUrl": "https://example.com",\n    "searchUrl": "...",\n    "ruleSearch": { ... },\n    "ruleBookInfo": { ... },\n    "ruleToc": { ... },\n    "ruleContent": { ... }\n  }\n]`}
          />

          <button
            onClick={handleImport}
            disabled={importing || !jsonInput.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {importing ? '导入中...' : '导入书源'}
          </button>

          {importResult && (
            <div className={`mt-4 rounded-xl border p-4 ${
              importResult.ok
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20'
                : 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-950/20'
            }`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {importResult.ok ? (
                  <><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-emerald-800 dark:text-emerald-200">导入成功</span></>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-800 dark:text-red-200">导入失败</span></>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {importResult.errors.map((e, i) => <li key={i} className="ml-5 list-disc">{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subscribe tab */}
      {activeTab === 'subscribe' && (
        <div className="rounded-2xl border border-violet-100 bg-white/80 p-5 dark:border-violet-500/10 dark:bg-gray-950/60">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">订阅书源地址</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            输入 Legado 书源订阅地址（如 https://legado.aoaostar.com/sources/xxx.json）
          </p>

          <div className="mt-4 flex gap-3">
            <input
              type="url"
              value={subUrl}
              onChange={(e) => setSubUrl(e.target.value)}
              placeholder="https://legado.aoaostar.com/sources/..."
              className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-violet-500/20 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleSubscribe}
              disabled={subscribing || !subUrl.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {subscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {subscribing ? '订阅中...' : '添加订阅'}
            </button>
          </div>

          {subResult && (
            <div className={`mt-4 rounded-xl border p-4 ${
              subResult.ok
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20'
                : 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-950/20'
            }`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {subResult.ok ? (
                  <><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-emerald-800 dark:text-emerald-200">订阅成功</span></>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-800 dark:text-red-200">订阅失败</span></>
                )}
              </div>
              {subResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {subResult.errors.map((e, i) => <li key={i} className="ml-5 list-disc">{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
