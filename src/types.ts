export interface LegadoRuleSearch {
  bookList?: string;
  name?: string;
  author?: string;
  intro?: string;
  coverUrl?: string;
  bookUrl?: string;
  kind?: string;
  lastChapter?: string;
  checkKeyWord?: string;
  wordCount?: string;
}

export type LegadoRuleExplore = LegadoRuleSearch;

export interface LegadoRuleBookInfo {
  init?: string;
  name?: string;
  author?: string;
  intro?: string;
  coverUrl?: string;
  tocUrl?: string;
  kind?: string;
  lastChapter?: string;
  wordCount?: string;
}

export interface LegadoRuleToc {
  chapterList?: string;
  chapterName?: string;
  chapterUrl?: string;
  isVip?: string;
  isPay?: string;
  nextTocUrl?: string;
  updateTime?: string;
  wordCount?: string;
  chapterInfo?: string;
}

export interface LegadoRuleContent {
  content?: string;
  nextContentUrl?: string;
  imageStyle?: string;
  sourceRegex?: string;
  replaceRegex?: string;
  payAction?: string;
}

export interface LegadoBookSourceRule {
  bookSourceName?: string;
  bookSourceUrl?: string;
  bookSourceGroup?: string;
  bookSourceType?: number;
  customButton?: boolean | unknown;
  eventListener?: boolean | unknown;
  variable?: string | Record<string, unknown>;
  loginUi?: string | unknown;
  concurrentRate?: string | number;
  respondTime?: number;
  lastUpdateTime?: string | number;
  enabled?: boolean;
  enabledCookieJar?: boolean;
  enabledExplore?: boolean;
  exploreUrl?: string;
  header?: string | Record<string, string>;
  jsLib?: string;
  loginUrl?: string;
  searchUrl?: string;
  bookInfoUrl?: string;
  bookInfoInit?: string;
  bookUrlPattern?: string;
  tocUrl?: string;
  chapterUrl?: string;
  ruleSearch?: LegadoRuleSearch;
  ruleExplore?: LegadoRuleExplore;
  ruleBookInfo?: LegadoRuleBookInfo;
  ruleToc?: LegadoRuleToc;
  ruleContent?: LegadoRuleContent;
  ruleReview?: unknown;
  customOrder?: number;
  weight?: number;
}

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
  language?: string;
  legado?: LegadoBookSourceRule;
  type?: 'opds' | 'legado';
  capabilities?: BookSourceCapabilities;
}

export interface BookSourceCapabilities {
  searchSupported: boolean;
  catalogSupported: boolean;
  searchMode: 'opds' | 'template' | 'legado' | 'disabled';
  catalogMode: 'navigation' | 'acquisition' | 'flat' | 'legado' | 'disabled';
  acquisitionTypes: string[];
  lastCheckedAt?: number;
  lastError?: string;
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
  rel?: string;
  type?: string;
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
  chaptersUrl?: string;
  acquisitionHref?: string;
  lastRecord?: BookReadRecord | null;
}

export interface BookChapter {
  id: string;
  title: string;
  href: string;
  order: number;
}

export interface BookChapterContent {
  id: string;
  title: string;
  href: string;
  content: string;
  nextHref?: string;
  previousHref?: string;
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
