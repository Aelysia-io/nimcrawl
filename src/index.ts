/**
 * NimCrawl - A highly efficient web scraper and crawler
 */

import { crawlUrl, mapUrl } from "./core/crawler";
import { batchScrapeUrls, scrapeUrl } from "./core/scraper";
import type {
	CrawlOptions,
	CrawlResult,
	FetchOptions,
	ScrapeOptions,
	ScrapeResult,
} from "./types";
import { createCache } from "./utils/cache";
import { createRateLimiter } from "./utils/rate-limiter";

// Default options
const DEFAULT_SCRAPE_OPTIONS: ScrapeOptions = {
	formats: ["markdown"],
	useJsdom: false,
	extractMetadata: true,
	extractLinks: true,
};

const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
	maxDepth: 3,
	maxPages: 100,
	concurrency: 5,
	allowExternalDomains: false,
};

// Create cache and rate limiter instances
const cache = createCache<ScrapeResult>();
const rateLimiter = createRateLimiter();

/**
 * Scrapes a URL with caching and rate limiting
 */
export async function scrape(
	url: string,
	options: ScrapeOptions = {},
): Promise<ScrapeResult> {
	// Generate cache key based on URL and options
	const cacheKey = `scrape:${url}:${JSON.stringify(options)}`;

	// Check cache first
	const cachedResult = cache.get(cacheKey);
	if (cachedResult) {
		return cachedResult;
	}

	// Apply rate limiting
	await rateLimiter.acquire(url);

	// Merge with default options
	const mergedOptions: ScrapeOptions = {
		...DEFAULT_SCRAPE_OPTIONS,
		...options,
	};

	// Perform the scrape
	const result = await scrapeUrl(url, mergedOptions);

	// Cache the result
	if (result.success) {
		cache.set(cacheKey, result);
	}

	return result;
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
	// Merge with default options
	const mergedOptions: ScrapeOptions = {
		...DEFAULT_SCRAPE_OPTIONS,
		...options,
	};

	// Create rate-limited scrape function
	const rateLimitedScrape = rateLimiter.wrap(scrapeUrl, ([url]) => url);

	// Perform batch scrape with the rate-limited function
	const results: Array<NonNullable<ScrapeResult["data"]>> = [];
	const errors: string[] = [];

	await Promise.all(
		urls.map(async (url) => {
			// Check cache first
			const cacheKey = `scrape:${url}:${JSON.stringify(mergedOptions)}`;
			const cachedResult = cache.get(cacheKey);

			if (cachedResult?.success && cachedResult?.data) {
				results.push(cachedResult.data);
				return;
			}

			try {
				const result = await rateLimitedScrape(url, mergedOptions);

				if (result.success && result.data) {
					results.push(result.data);

					// Cache the result
					cache.set(cacheKey, result);
				} else if (result.error) {
					errors.push(result.error);
				}
			} catch (error) {
				if (error instanceof Error) {
					errors.push(`Failed to scrape ${url}: ${error.message}`);
				} else {
					errors.push(`Failed to scrape ${url}: Unknown error`);
				}
			}
		}),
	);

	return {
		success: errors.length === 0,
		error: errors.length > 0 ? errors.join("; ") : undefined,
		data: results,
	};
}

/**
 * Crawls a website starting from a URL
 */
export async function crawl(
	url: string,
	options: CrawlOptions = {},
): Promise<CrawlResult> {
	// Merge with default options
	const mergedOptions: CrawlOptions = {
		...DEFAULT_CRAWL_OPTIONS,
		...options,
	};

	return await crawlUrl(url, mergedOptions);
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

export type {
	ScrapeOptions,
	ScrapeResult,
	CrawlOptions,
	CrawlResult,
	FetchOptions,
};
