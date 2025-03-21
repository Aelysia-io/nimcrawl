/**
 * Crawler Engine
 *
 * Handles crawling websites with parallel execution and resource management
 */

import pLimit from "p-limit";
import { extractLinks, filterLinks } from "../processors/link-extractor";
import type { CrawlOptions, CrawlResult, ScrapeResult } from "../types";
import { scrapeUrl } from "./scraper";

interface CrawlState {
  visited: Set<string>;
  queue: string[];
  results: Array<NonNullable<ScrapeResult["data"]>>;
  errors: string[];
  depth: Map<string, number>;
  currentDepth: number;
  pagesProcessed: number;
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

  if (process.env.DEBUG) {
    console.log(`🕸️ Starting crawl of ${startUrl}`);
    console.log(`🕸️ Max depth: ${maxDepth}, Max pages: ${maxPages}, Concurrency: ${concurrency}`);
  }

  // Initialize crawl state
  const state: CrawlState = {
    visited: new Set<string>(),
    queue: [startUrl],
    results: [],
    errors: [],
    depth: new Map<string, number>(),
    currentDepth: 0,
    pagesProcessed: 0,
  };

  // Set initial depth for start URL
  state.depth.set(startUrl, 0);

  // Create concurrency limiter
  const limit = pLimit(concurrency);

  // Store all active promises
  let activePromises: Promise<void>[] = [];
  // Track which promises have completed
  const completedPromises = new Set<Promise<void>>();

  // Continue until queue is empty or we've hit max pages
  while (state.pagesProcessed < maxPages) {
    // Process a batch of URLs from the queue
    const batch: string[] = [];

    // Take up to concurrency * 2 URLs from the queue
    while (batch.length < concurrency * 2 && state.queue.length > 0) {
      const url = state.queue.shift();
      if (!url) continue;

      // Skip if already visited
      if (state.visited.has(url)) {
        if (process.env.DEBUG) {
          console.log(`🔄 Skipping already visited URL: ${url}`);
        }
        continue;
      }

      // Mark as visited
      state.visited.add(url);

      // Get depth of current URL
      const urlDepth = state.depth.get(url) ?? 0;

      // Skip if we've exceeded max depth
      if (urlDepth > maxDepth) {
        if (process.env.DEBUG) {
          console.log(`🔄 Skipping URL at max depth: ${url} (depth: ${urlDepth})`);
        }
        continue;
      }

      // Add to current batch
      batch.push(url);
    }

    // If batch is empty and no active promises, we're done
    if (batch.length === 0 && activePromises.length === 0) {
      if (process.env.DEBUG) {
        console.log("🏁 No more URLs to process, finishing crawl");
      }
      break;
    }

    // Process the batch
    for (const url of batch) {
      const urlDepth = state.depth.get(url) ?? 0;

      if (process.env.DEBUG) {
        console.log(`🕸️ Processing URL: ${url} (depth: ${urlDepth})`);
      }

      // Process the URL and add to active promises
      const processPromise = limit(() => processUrl(url, urlDepth, state, options));
      activePromises.push(processPromise);

      // Set up completion tracking
      processPromise.then(() => {
        completedPromises.add(processPromise);
      });
    }

    // If queue is empty or we have lots of active promises, wait for some to complete
    if (state.queue.length === 0 || activePromises.length > concurrency * 3) {
      if (process.env.DEBUG) {
        console.log(`⏳ Waiting for some promises to resolve (${activePromises.length} active, ${state.queue.length} in queue)`);
      }

      // Wait for some promises to complete
      if (activePromises.length > 0) {
        // Wait for the next promise to complete or a short timeout
        await Promise.race([
          Promise.any(activePromises),
          new Promise(resolve => setTimeout(resolve, 100))
        ]);

        // Clean up completed promises
        activePromises = activePromises.filter(p => !completedPromises.has(p));
        completedPromises.clear();
      } else {
        // No active promises but queue is empty, we're done
        break;
      }
    }
  }

  // Wait for all remaining promises to complete
  if (activePromises.length > 0) {
    if (process.env.DEBUG) {
      console.log(`⏳ Waiting for final ${activePromises.length} promises to resolve`);
    }
    await Promise.all(activePromises);
  }

  if (process.env.DEBUG) {
    console.log(`✅ Crawl completed. Visited ${state.visited.size} URLs, processed ${state.results.length} pages`);
  }

  return {
    success: state.errors.length === 0,
    error: state.errors.length > 0 ? state.errors.join("; ") : undefined,
    status: "completed",
    total: state.visited.size,
    completed: state.results.length,
    data: state.results,
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
          if (!state.visited.has(link)) {
            state.queue.push(link);
            state.depth.set(link, depth + 1);
            addedLinks++;
            if (process.env.DEBUG) {
              console.log(`➕ Added to queue: ${link} (depth ${depth + 1})`);
            }
          } else if (process.env.DEBUG) {
            console.log(`🔄 Already visited, not queueing: ${link}`);
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
      state.errors.push(scrapeResult.error);
      if (process.env.DEBUG) {
        console.error(`❌ Error processing ${url}: ${scrapeResult.error}`);
      }
    }
  } catch (error) {
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
