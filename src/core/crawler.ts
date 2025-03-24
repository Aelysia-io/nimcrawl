/**
 * Crawler Engine
 *
 * Handles crawling websites with parallel execution and resource management
 */

import pLimit from "p-limit";
import { extractLinks, filterLinks } from "../processors/link-extractor";
import type { CrawlOptions, CrawlResult, ScrapeResult } from "../types";
import { createCache } from "../utils/cache";
import { scrapeUrl } from "./scraper";

// Cache for seen URLs to avoid redundant checks
const seenUrlsCache = createCache<boolean>(60 * 60 * 1000); // 1 hour cache

// Cache for failed URLs to avoid retrying them repeatedly
const failedUrlsCache = createCache<string>(15 * 60 * 1000); // 15 minutes cache

interface CrawlState {
  visited: Set<string>;
  queue: string[];
  results: Array<NonNullable<ScrapeResult["data"]>>;
  errors: string[];
  depth: Map<string, number>;
  currentDepth: number;
  pagesProcessed: number;
  domainCounts: Map<string, number>; // Track domains for rate limiting
  lastProcessed: Map<string, number>; // Last time a domain was processed
}

/**
 * Extracts domain from URL for rate limiting
 */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url; // Fallback
  }
}

/**
 * Crawls a website starting from a given URL
 */
export async function crawlUrl(
  startUrl: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  // Default options
  const maxDepth = options.maxDepth ?? 3;
  const maxPages = options.maxPages ?? 100;
  const concurrency = options.concurrency ?? 5;
  const domainDelay = options.domainDelay ?? 200; // ms to wait between requests to same domain
  const domainConcurrency = options.domainConcurrency ?? 2; // max concurrent requests per domain

  if (process.env.DEBUG) {
    console.log(`🕸️ Starting crawl of ${startUrl}`);
    console.log(`🕸️ Max depth: ${maxDepth}, Max pages: ${maxPages}, Concurrency: ${concurrency}`);
  }

  // Clear any previously failed URLs for this crawl
  failedUrlsCache.clear();

  // Initialize crawl state
  const state: CrawlState = {
    visited: new Set<string>(),
    queue: [startUrl],
    results: [],
    errors: [],
    depth: new Map<string, number>(),
    currentDepth: 0,
    pagesProcessed: 0,
    domainCounts: new Map<string, number>(),
    lastProcessed: new Map<string, number>(),
  };

  // Set initial depth for start URL
  state.depth.set(startUrl, 0);

  // Create concurrency limiter
  const limit = pLimit(concurrency);

  // Store all active promises
  let activePromises: Promise<void>[] = [];
  // Track which promises have completed
  const completedPromises = new Set<Promise<void>>();

  // Main crawl loop
  while ((state.pagesProcessed < maxPages) && (state.queue.length > 0 || activePromises.length > 0)) {
    // Process a batch of URLs from the queue, grouping by domain
    const domainBatches = new Map<string, string[]>();

    // Group URLs by domain for controlled concurrency
    for (let i = 0; i < state.queue.length && domainBatches.size < concurrency; i++) {
      const url = state.queue[i];
      if (!url) continue;

      const domain = getDomain(url);

      // Skip if already visited or in failed cache
      if (state.visited.has(url) || failedUrlsCache.has(url)) {
        // Remove from queue
        state.queue.splice(i, 1);
        i--; // Adjust index since we removed an item
        continue;
      }

      // Skip if we're already processing too many URLs from this domain
      const domainCount = state.domainCounts.get(domain) || 0;
      if (domainCount >= domainConcurrency) {
        continue;
      }

      // Add to domain batch
      if (!domainBatches.has(domain)) {
        domainBatches.set(domain, []);
      }
      domainBatches.get(domain)?.push(url);

      // Remove from queue
      state.queue.splice(i, 1);
      i--; // Adjust index since we removed an item

      // Mark as visited
      state.visited.add(url);
    }

    // If no URLs to process but have active promises, wait for some to complete
    if (domainBatches.size === 0 && activePromises.length > 0) {
      if (process.env.DEBUG) {
        console.log(`⏳ Waiting for ${activePromises.length} active promises to resolve. Queue size: ${state.queue.length}`);
      }

      // Wait for the next promise to complete
      try {
        await Promise.race(activePromises);
      } catch (error) {
        // Ignore errors, they're handled in the processing function
        if (process.env.DEBUG) {
          console.error("Error in promise race:", error instanceof Error ? error.message : String(error));
        }
      }

      // Clean up completed promises - needs to be more robust
      activePromises = activePromises.filter(p => !completedPromises.has(p));
      completedPromises.clear();

      continue;
    }

    // If there are no URLs to process and no active promises, we're done
    if (domainBatches.size === 0 && activePromises.length === 0) {
      if (process.env.DEBUG) {
        console.log("🏁 Crawl complete: No more URLs to process and no active promises");
      }
      break;
    }

    // Process each domain batch
    for (const [domain, urls] of domainBatches.entries()) {
      // Update domain count
      state.domainCounts.set(domain, (state.domainCounts.get(domain) || 0) + urls.length);

      // Process all URLs in the domain batch sequentially
      const domainPromise = limit(async () => {
        try {
          // Process URLs in sequence for the same domain
          for (const url of urls) {
            // Get depth of current URL
            const urlDepth = state.depth.get(url) ?? 0;

            // Check if we've exceeded max depth
            if (urlDepth > maxDepth) {
              // No need to process this URL
              if (process.env.DEBUG) {
                console.log(`🔄 Skipping URL at max depth: ${url} (depth: ${urlDepth})`);
              }
              continue;
            }

            // Rate limiting for domain
            const lastProcessedTime = state.lastProcessed.get(domain);
            if (lastProcessedTime) {
              const timeElapsed = Date.now() - lastProcessedTime;
              if (timeElapsed < domainDelay) {
                // Wait before processing next URL from same domain
                await new Promise(resolve => setTimeout(resolve, domainDelay - timeElapsed));
              }
            }

            // Process the URL
            if (process.env.DEBUG) {
              console.log(`🕸️ Processing URL: ${url} (depth: ${urlDepth})`);
            }

            try {
              await processUrl(url, urlDepth, state, options);
            } catch (urlError) {
              // Add to failed cache
              failedUrlsCache.set(url, urlError instanceof Error ? urlError.message : String(urlError));

              // Add to errors
              state.errors.push(`Error processing ${url}: ${urlError instanceof Error ? urlError.message : String(urlError)}`);

              if (process.env.DEBUG) {
                console.error(`❌ Error processing ${url}: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
              }
            }

            // Update last processed time
            state.lastProcessed.set(domain, Date.now());
          }
        } finally {
          // Decrement domain count when all URLs are processed
          state.domainCounts.set(domain, Math.max(0, (state.domainCounts.get(domain) || 0) - urls.length));
        }
      });

      // Set up completion tracking
      activePromises.push(domainPromise);
      domainPromise.then(() => {
        completedPromises.add(domainPromise);
      }).catch((error: unknown) => {
        completedPromises.add(domainPromise);
        console.error(`Error in domain batch for ${domain}:`, error);
      });
    }

    // Check if we have too many active promises
    if (activePromises.length > concurrency * 2) {
      if (process.env.DEBUG) {
        console.log(`⏳ Too many active promises (${activePromises.length}), waiting for some to complete. Queue size: ${state.queue.length}`);
      }

      // Wait for any promise to complete
      try {
        await Promise.race(activePromises);
      } catch (error) {
        // Ignore errors, they're handled in the processing function
        if (process.env.DEBUG) {
          console.error("Error in promise race:", error instanceof Error ? error.message : String(error));
        }
      }

      // Clean up completed promises
      activePromises = activePromises.filter(p => !completedPromises.has(p));
      completedPromises.clear();
    }
  }

  // Wait for all remaining promises to complete
  if (activePromises.length > 0) {
    if (process.env.DEBUG) {
      console.log(`⏳ Waiting for final ${activePromises.length} promises to resolve. Queue size: ${state.queue.length}`);
    }

    // Wait for all promises to complete, even if some fail
    if (activePromises.length > 0) {
      await Promise.allSettled(activePromises);
    }
  }

  // One final check of the queue - if it's not empty, there's an issue with the crawl logic
  if (state.queue.length > 0) {
    if (process.env.DEBUG) {
      console.log(`⚠️ Queue is not empty after all promises resolved. This indicates we've hit maxPages limit or there's an issue with filtering.`);
      console.log(`⚠️ ${state.queue.length} URLs left in queue. First few: ${state.queue.slice(0, 3).join(', ')}...`);
    }
  }

  if (process.env.DEBUG) {
    console.log(`✅ Crawl completed. Visited ${state.visited.size} URLs, processed ${state.pagesProcessed} pages`);
    console.log(`Remaining queue: ${state.queue.length} items`);
    console.log(`Cache stats - Seen URLs: ${seenUrlsCache.stats().size}, Failed URLs: ${failedUrlsCache.stats().size}`);
  }

  return {
    success: state.errors.length === 0,
    error: state.errors.length > 0 ? state.errors.join("; ") : undefined,
    status: state.queue.length > 0 ? "incomplete" : "completed",
    total: state.visited.size + state.queue.length, // Include queued items in total
    completed: state.pagesProcessed,
    data: state.results,
    remaining: state.queue.length,
  };
}

/**
 * Processes a single URL in the crawl
 */
async function processUrl(
  url: string,
  depth: number,
  state: CrawlState,
  options: CrawlOptions,
): Promise<void> {
  try {
    if (process.env.DEBUG) {
      console.log(`🔍 Processing URL: ${url} (depth: ${depth})`);
    }

    // Check if we already have an error for this URL
    if (failedUrlsCache.has(url)) {
      if (process.env.DEBUG) {
        console.log(`🚫 Skipping previously failed URL: ${url}`);
      }
      return;
    }

    // Scrape the URL
    const scrapeResult = await scrapeUrl(url, {
      formats: options.formats || ["markdown", "html", "links"],
      extractLinks: true,
      extractMetadata: true,
      beforeTransform: options.beforeTransform,
      afterTransform: options.afterTransform,
      ...options.fetchOptions,
    });

    if (scrapeResult.success && scrapeResult.data) {
      // Add result to state
      state.results.push(scrapeResult.data);
      state.pagesProcessed++;

      if (process.env.DEBUG) {
        console.log(`✅ Successfully processed: ${url}`);
      }

      // Process links if we haven't reached max depth
      if (depth < (options.maxDepth ?? 3) && scrapeResult.data.links) {
        const allLinks = scrapeResult.data.links || [];

        if (process.env.DEBUG) {
          console.log(`Found ${allLinks.length} raw links on ${url}`);
        }

        // Filter links based on patterns
        const filteredLinks = filterLinks(allLinks, url, {
          includePatterns: options.includePatterns,
          excludePatterns: options.excludePatterns,
          allowExternalDomains: options.allowExternalDomains,
        });

        // Debug info about filtered links
        if (process.env.DEBUG) {
          console.log(`After filtering: ${filteredLinks.length} links remain for ${url}`);
        }

        // Add unvisited links to queue with increased depth
        let addedLinks = 0;
        for (const link of filteredLinks) {
          // Normalize URL to avoid duplicates
          try {
            const normalizedUrl = new URL(link).toString();

            // Skip if already visited or in the queue
            if (
              state.visited.has(normalizedUrl) ||
              state.queue.includes(normalizedUrl) ||
              failedUrlsCache.has(normalizedUrl) ||
              seenUrlsCache.has(normalizedUrl)
            ) {
              if (process.env.DEBUG) {
                console.log(`🔄 Already processed or queued, skipping: ${normalizedUrl}`);
              }
              continue;
            }

            // Add to queue and mark seen
            state.queue.push(normalizedUrl);
            state.depth.set(normalizedUrl, depth + 1);
            seenUrlsCache.set(normalizedUrl, true);
            addedLinks++;

            if (process.env.DEBUG && addedLinks <= 5) { // Limit log noise
              console.log(`➕ Added to queue: ${normalizedUrl} (depth ${depth + 1})`);
            }
          } catch (urlError) {
            // Skip invalid URLs
            if (process.env.DEBUG) {
              console.log(`⚠️ Invalid URL: ${link}`);
            }
          }
        }

        if (process.env.DEBUG) {
          console.log(`Added ${addedLinks} new links to the queue from ${url}`);
          console.log(`Current queue size: ${state.queue.length}`);
        }
      } else if (process.env.DEBUG) {
        console.log(`Max depth reached or no links found for ${url} (depth: ${depth})`);
      }
    } else if (scrapeResult.error) {
      // Add to failed URLs cache
      failedUrlsCache.set(url, scrapeResult.error);

      state.errors.push(scrapeResult.error);
      if (process.env.DEBUG) {
        console.error(`❌ Error processing ${url}: ${scrapeResult.error}`);
      }
    }
  } catch (error) {
    // Add to failed URLs cache
    failedUrlsCache.set(url, error instanceof Error ? error.message : String(error));

    if (error instanceof Error) {
      state.errors.push(`Failed to process ${url}: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(`❌ Exception processing ${url}: ${error.message}`);
      }
    } else {
      state.errors.push(`Failed to process ${url}: Unknown error`);
      if (process.env.DEBUG) {
        console.error(`❌ Unknown exception processing ${url}`);
      }
    }
  }
}

/**
 * Maps a website and returns all URLs
 */
export async function mapUrl(
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
  try {
    // Scrape the URL to get initial links
    const scrapeResult = await scrapeUrl(url, {
      formats: ["links"],
      extractLinks: true,
    });

    if (!scrapeResult.success || !scrapeResult.data?.links) {
      return {
        success: false,
        links: [],
        error: scrapeResult.error || "Failed to extract links",
      };
    }

    // Filter links based on patterns
    const filteredLinks = filterLinks(scrapeResult.data.links, url, {
      includePatterns: options.includePatterns,
      excludePatterns: options.excludePatterns,
      allowExternalDomains: options.allowExternalDomains,
    });

    // If search is provided, filter links that match the search term
    let resultLinks = filteredLinks;
    if (options.search) {
      const searchTerm = options.search.toLowerCase();
      resultLinks = resultLinks.filter((link) =>
        link.toLowerCase().includes(searchTerm),
      );

      // Sort by relevance
      resultLinks.sort((a, b) => {
        const aScore = a.toLowerCase().includes(searchTerm) ? 1 : 0;
        const bScore = b.toLowerCase().includes(searchTerm) ? 1 : 0;
        return bScore - aScore;
      });
    }

    return {
      success: true,
      links: resultLinks,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        links: [],
        error: `Failed to map ${url}: ${error.message}`,
      };
    }
    return {
      success: false,
      links: [],
      error: `Failed to map ${url}: Unknown error`,
    };
  }
}
