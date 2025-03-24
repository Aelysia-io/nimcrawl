/**
 * NimCrawl - A highly efficient web scraper and crawler
 */

import { crawlUrl, mapUrl } from "./core/crawler";
import { batchScrapeUrls, scrapeUrl } from "./core/scraper";

import type {
  CrawlOptions,
  CrawlResult,
  ExtractOptions,
  ExtractResult,
  FetchOptions,
  ScrapeOptions,
  ScrapeResult,
} from "./types";
import { createCache } from "./utils/cache";
import { extractStructuredData, summarizeContent } from "./utils/llm-processor";
import type { SummarizeOptions, SummarizeResult } from "./utils/llm-processor";
import { createRateLimiter } from "./utils/rate-limiter";

// Default options
const DEFAULT_SCRAPE_OPTIONS: ScrapeOptions = {
  formats: ["markdown"],
  extractMetadata: true,
  extractLinks: true,
};

const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxDepth: 3,
  maxPages: 100,
  concurrency: 5,
  allowExternalDomains: false,
  domainDelay: 200,       // 200ms between requests to same domain
  domainConcurrency: 2,   // Max 2 concurrent requests per domain
};

// Create cache and rate limiter instances
const scrapeCache = createCache<ScrapeResult>(15 * 60 * 1000); // 15 minutes cache
const rateLimiter = createRateLimiter();

// Performance tracking
const perfMetrics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalTime: 0,
};

/**
 * Scrapes a URL with caching and rate limiting
 */
export async function scrape(
  url: string,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const startTime = performance.now();
  perfMetrics.requests++;

  // Generate cache key based on URL and options
  const cacheKey = `scrape:${url}:${JSON.stringify(options)}`;

  // Check cache first
  const cachedResult = scrapeCache.get(cacheKey);
  if (cachedResult) {
    perfMetrics.cacheHits++;
    perfMetrics.totalTime += performance.now() - startTime;

    // Log cache hit if in debug mode
    if (process.env.DEBUG) {
      console.log(`Cache hit for ${url}`);
    }

    return cachedResult;
  }

  perfMetrics.cacheMisses++;

  // Apply rate limiting
  await rateLimiter.acquire(url);

  // Merge with default options
  const mergedOptions: ScrapeOptions = {
    ...DEFAULT_SCRAPE_OPTIONS,
    ...options,
  };

  try {
    // Perform the scrape
    const result = await scrapeUrl(url, mergedOptions);

    // Cache the result only if successful
    if (result.success && result.data && Object.keys(result.data).length > 0) {
      scrapeCache.set(cacheKey, result);
    }

    // Ensure result has a data object even in failure cases
    if (!result.data) {
      result.data = {};
    }

    perfMetrics.totalTime += performance.now() - startTime;
    return result;
  } catch (error) {
    // Handle any unexpected errors
    const errorResult: ScrapeResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during scrape',
      data: {}, // Always ensure data exists
    };

    perfMetrics.totalTime += performance.now() - startTime;
    return errorResult;
  }
}

/**
 * Batch scrapes multiple URLs with caching and rate limiting
 */
export async function batchScrape(
  urls: string[],
  options: ScrapeOptions = {},
): Promise<{
  success: boolean;
  error?: string;
  data: Array<NonNullable<ScrapeResult["data"]>>;
}> {
  const startTime = performance.now();

  // Merge with default options
  const mergedOptions: ScrapeOptions = {
    ...DEFAULT_SCRAPE_OPTIONS,
    ...options,
  };

  try {
    // Use batchScrapeUrls to process URLs
    const result = await batchScrapeUrls(urls, mergedOptions);

    if (process.env.DEBUG) {
      const endTime = performance.now();
      console.log(`Batch scrape completed in ${Math.round(endTime - startTime)}ms`);
      console.log(`Processed ${urls.length} URLs, ${result.data.length} successful`);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown batch scraping error',
      data: [],
    };
  }
}

/**
 * Crawls a website starting from a URL
 */
export async function crawl(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const startTime = performance.now();

  // Merge with default options
  const mergedOptions: CrawlOptions = {
    ...DEFAULT_CRAWL_OPTIONS,
    ...options,
  };

  const result = await crawlUrl(url, mergedOptions);

  if (process.env.DEBUG) {
    const endTime = performance.now();
    console.log(`Crawl completed in ${Math.round(endTime - startTime)}ms`);
    console.log(`Performance: ${perfMetrics.requests} total requests, ${perfMetrics.cacheHits} cache hits (${Math.round(perfMetrics.cacheHits / perfMetrics.requests * 100)}% cache hit rate)`);
    console.log(`Average request time: ${Math.round(perfMetrics.totalTime / perfMetrics.requests)}ms`);
  }

  return result;
}

/**
 * Maps a website and returns all URLs
 */
export async function map(
  url: string,
  options: {
    maxDepth?: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    allowExternalDomains?: boolean;
    search?: string;
  } = {},
): Promise<{
  success: boolean;
  links: string[];
  error?: string;
}> {
  return await mapUrl(url, options);
}

/**
 * Extracts structured data from content using LLMs
 */
export async function extract(
  content: string,
  options: ExtractOptions = {},
): Promise<ExtractResult> {
  return await extractStructuredData(content, options);
}

/**
 * Summarizes content using LLMs
 */
export async function summarize(
  content: string,
  options: SummarizeOptions = {},
): Promise<SummarizeResult> {
  return await summarizeContent(content, options);
}

/**
 * Gets performance metrics
 */
export function getPerformanceMetrics() {
  return {
    ...perfMetrics,
    cacheHitRate: perfMetrics.requests > 0 ? perfMetrics.cacheHits / perfMetrics.requests : 0,
    averageRequestTime: perfMetrics.requests > 0 ? perfMetrics.totalTime / perfMetrics.requests : 0
  };
}

export type {
  ScrapeOptions,
  ScrapeResult,
  CrawlOptions,
  CrawlResult,
  FetchOptions,
  ExtractOptions,
  ExtractResult,
  SummarizeOptions,
  SummarizeResult,
};
