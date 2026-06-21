export interface BookSource {
  id: string;
  name: string;
  url: string;
  enabled?: boolean;
  authMode?: 'none' | 'basic' | 'header';
  username?: string;
  password?: string;
  headerName?: string;
  headerValue?: string;
  searchTemplate?: string;
  preferFormat?: Array<'epub' | 'pdf'>;
  capabilities?: BookSourceCapabilities;
}

export interface BookSourceCapabilities {
  searchSupported: boolean;
  catalogSupported: boolean;
  acquisitionTypes: string[];
}

export interface BookAcquisitionLink {
  rel: string;
  type: string;
  href: string;
  title?: string;
}

export interface BookNavLink {
  title: string;
  href: string;
}

export interface BookListItem {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  author?: string;
  cover?: string;
  summary?: string;
  language?: string;
  published?: string;
  updated?: string;
  tags?: string[];
  detailHref?: string;
  acquisitionLinks: BookAcquisitionLink[];
}

export interface BookDetail extends BookListItem {
  publisher?: string;
  identifier?: string;
  series?: string;
  categories?: string[];
  navigation?: BookNavLink[];
}

export interface BookCatalogResult {
  sourceId: string;
  sourceName: string;
  title: string;
  subtitle?: string;
  href: string;
  entries: BookListItem[];
  navigation: BookNavLink[];
  nextHref?: string;
  previousHref?: string;
  searchHref?: string;
}

export interface BookSearchFailure {
  sourceId: string;
  sourceName: string;
  error: string;
}

export interface BookSearchResult {
  results: BookListItem[];
  failedSources: BookSearchFailure[];
}

export type BookFormat = 'epub' | 'pdf' | 'chapters';

export interface BookReadManifest {
  book: BookDetail;
  format: BookFormat;
  fileUrl?: string;
  acquisitionHref?: string;
  lastRecord?: BookReadRecord | null;
}

export interface BookLocator {
  type: 'epub-cfi' | 'pdf-page' | 'href' | 'chapter';
  value: string;
  chapterTitle?: string;
}

export interface BookReadRecord {
  sourceId: string;
  sourceName: string;
  bookId: string;
  title: string;
  author?: string;
  cover?: string;
  format: BookFormat;
  detailHref?: string;
  acquisitionHref?: string;
  locator: BookLocator;
  progressPercent: number;
  chapterTitle?: string;
  saveTime: number;
}

export interface BookShelfItem {
  sourceId: string;
  sourceName: string;
  bookId: string;
  title: string;
  author?: string;
  cover?: string;
  format?: BookFormat;
  detailHref?: string;
  acquisitionHref?: string;
  progressPercent?: number;
  lastReadTime?: number;
  lastLocatorType?: BookLocator['type'];
  lastLocatorValue?: string;
  lastChapterTitle?: string;
  saveTime: number;
}
