import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookShelfItem, BookReadRecord, BookReadManifest, BookDetail, BookFormat } from '../types';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  dark: false,
  toggle: () => set((s) => ({ dark: !s.dark })),
  setDark: (dark) => set({ dark }),
}));

interface ShelfState {
  items: Record<string, BookShelfItem>;
  setItem: (key: string, item: BookShelfItem) => void;
  removeItem: (key: string) => void;
}

function generateKey(sourceId: string, bookId: string) {
  return `${sourceId}::${bookId}`;
}

export const useShelfStore = create<ShelfState>()(
  persist(
    (set) => ({
      items: {},
      setItem: (key, item) =>
        set((s) => ({
          items: { ...s.items, [key]: item },
        })),
      removeItem: (key) =>
        set((s) => {
          const next = { ...s.items };
          delete next[key];
          return { items: next };
        }),
    }),
    { name: 'mp-book-shelf' }
  )
);

interface HistoryState {
  records: Record<string, BookReadRecord>;
  setRecord: (key: string, record: BookReadRecord) => void;
  removeRecord: (key: string) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: {},
      setRecord: (key, record) =>
        set((s) => ({
          records: { ...s.records, [key]: record },
        })),
      removeRecord: (key) =>
        set((s) => {
          const next = { ...s.records };
          delete next[key];
          return { records: next };
        }),
    }),
    { name: 'mp-book-history' }
  )
);

export function saveToShelf(manifest: BookReadManifest) {
  const { book, format, acquisitionHref } = manifest;
  saveShelfItem(book, format, acquisitionHref);
}

export function saveToShelfFromDetail(detail: BookDetail, format?: BookFormat, acquisitionHref?: string) {
  saveShelfItem(detail, format, acquisitionHref);
}

function saveShelfItem(book: BookDetail, format?: BookFormat, acquisitionHref?: string) {
  const key = generateKey(book.sourceId, book.id);
  const shelf: BookShelfItem = {
    sourceId: book.sourceId,
    sourceName: book.sourceName,
    bookId: book.id,
    title: book.title,
    author: book.author,
    cover: book.cover,
    format,
    detailHref: book.detailHref,
    acquisitionHref,
    saveTime: Date.now(),
  };
  useShelfStore.getState().setItem(key, shelf);
}

export function saveReadRecord(manifest: BookReadManifest, progress: { value: string; type: BookReadRecord['locator']['type']; chapterTitle?: string; percent: number }) {
  const { book, format, acquisitionHref } = manifest;
  const key = generateKey(book.sourceId, book.id);
  const record: BookReadRecord = {
    sourceId: book.sourceId,
    sourceName: book.sourceName,
    bookId: book.id,
    title: book.title,
    author: book.author,
    cover: book.cover,
    format,
    detailHref: book.detailHref,
    acquisitionHref,
    locator: { type: progress.type, value: progress.value, chapterTitle: progress.chapterTitle },
    progressPercent: progress.percent,
    chapterTitle: progress.chapterTitle,
    saveTime: Date.now(),
  };
  useHistoryStore.getState().setRecord(key, record);
}
