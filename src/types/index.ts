/**
 * Core types for the nimcrawl crawler
 */

import type { ExtractedData, ExtractionSchema, OllamaModelOptions } from "../utils/llm-processor";

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
  beforeTransform?: (result: ScrapeResult) => void;
  afterTransform?: (result: ScrapeResult) => void;
  domainDelay?: number;
  domainConcurrency?: number;
}

export interface ScrapeOptions {
  formats?: OutputFormat[];
  extractMetadata?: boolean;
  extractLinks?: boolean;
  actions?: Action[];
  location?: LocationOptions;
  beforeTransform?: (result: ScrapeResult) => void;
  afterTransform?: (result: ScrapeResult) => void;
  extractOptions?: ExtractOptions;
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

/**
 * Options for extracting structured data using LLMs
 */
export interface ExtractOptions {
  schema?: ExtractionSchema;
  systemPrompt?: string;
  prompt?: string;
  model?: string;
  ollamaHost?: string;
  modelOptions?: OllamaModelOptions;
}

/**
 * Result of LLM-based extraction
 */
export interface ExtractResult {
  success: boolean;
  data?: ExtractedData;
  error?: string;
  rawResponse?: string;
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
  // Twitter card metadata
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: string;
  // Site information
  siteName?: string;
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
    extract?: ExtractedData;
    metadata?: PageMetadata;
  };
}

export interface CrawlResult {
  success: boolean;
  error?: string;
  status: "completed" | "scraping" | "failed" | "incomplete";
  total: number;
  completed: number;
  data: Array<ScrapeResult["data"]>;
  remaining?: number;
}

export interface ContentType {
  isStatic: boolean;
  needsJavaScript: boolean;
  format: string;
}
