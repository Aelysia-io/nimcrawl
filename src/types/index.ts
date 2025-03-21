/**
 * Core types for the nimcrawl crawler
 */

export interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  proxy?: string;
  followRedirects?: boolean;
}

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  allowExternalDomains?: boolean;
  concurrency?: number;
  fetchOptions?: FetchOptions;
  formats?: OutputFormat[];
  beforeTransform?: (result: ScrapeResult) => Promise<ScrapeResult> | ScrapeResult;
  afterTransform?: (result: ScrapeResult) => Promise<ScrapeResult> | ScrapeResult;
}

export interface ScrapeOptions {
  formats?: OutputFormat[];
  useJsdom?: boolean;
  extractMetadata?: boolean;
  extractLinks?: boolean;
  actions?: Action[];
  location?: LocationOptions;
  beforeTransform?: (result: ScrapeResult) => Promise<ScrapeResult> | ScrapeResult;
  afterTransform?: (result: ScrapeResult) => Promise<ScrapeResult> | ScrapeResult;
}

export interface LocationOptions {
  country?: string;
  languages?: string[];
}

export type OutputFormat =
  | "markdown"
  | "html"
  | "rawHtml"
  | "screenshot"
  | "links"
  | "extract";

export interface Action {
  type: "wait" | "click" | "write" | "press" | "scrape" | "screenshot";
  selector?: string;
  text?: string;
  key?: string;
  milliseconds?: number;
}

export interface ExtractOptions {
  schema?: Record<string, string | number | boolean | object | null>;
  systemPrompt?: string;
  prompt?: string;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  language?: string;
  keywords?: string[];
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  ogLocaleAlternate?: string[];
  ogSiteName?: string;
  sourceURL: string;
  statusCode: number;
}

export interface ScrapeResult {
  success: boolean;
  error?: string;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    screenshot?: string;
    links?: string[];
    extract?: Record<string, string | number | boolean | object | null>;
    metadata?: PageMetadata;
  };
}

export interface CrawlResult {
  success: boolean;
  error?: string;
  status: "completed" | "scraping" | "failed";
  total: number;
  completed: number;
  data: Array<ScrapeResult["data"]>;
}

export interface ContentType {
  isStatic: boolean;
  needsJavaScript: boolean;
  format: string;
}
