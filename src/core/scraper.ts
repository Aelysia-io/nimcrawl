/**
 * Core Scraper functionality
 */

import { convertHtmlToMarkdown } from "../processors/html-to-markdown";
import { extractLinks, filterLinks } from "../processors/link-extractor";
import { extractMetadata } from "../processors/metadata-extractor";
import type {
  OutputFormat,
  PageMetadata,
  ScrapeOptions,
  ScrapeResult,
} from "../types";
import { createCache } from "../utils/cache";
import { extractStructuredData } from "../utils/llm-processor";
import type { ExtractedData } from "../utils/llm-processor";
import { smartFetch } from "./fetcher";

// Create cache for markdown conversion to avoid redundant processing
const markdownCache = createCache<string>(30 * 60 * 1000); // 30 minutes
// Cache for extraction results
const extractionCache = createCache<ExtractedData>(30 * 60 * 1000); // 30 minutes

/**
 * Scrapes a single URL and returns the content in the requested formats
 */
export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  try {
    // Default options
    const formats = options.formats || ["markdown"];
    const extractMetadataFlag = options.extractMetadata ?? true;
    const extractLinksFlag = options.extractLinks ?? formats.includes("links");

    // Generate cache keys
    const fetchCacheKey = `fetch:${url}:${JSON.stringify(options.location || {})}`;

    // Fetch the content
    let html = "";
    let status = 0;
    let headers: Record<string, string> = {};
    let usedJsdom = false;
    let fetchError = null;

    try {
      // Attempt to fetch the content
      const fetchResult = await smartFetch(url, {
        // Pass location headers if provided
        headers: options.location
          ? {
            "Accept-Language": options.location.languages?.join(",") || "en-US",
          }
          : undefined,
      });

      html = fetchResult.html;
      status = fetchResult.status;
      headers = fetchResult.headers;
      usedJsdom = fetchResult.usedJsdom;

    } catch (error) {
      fetchError = error instanceof Error ? error.message : String(error);
      console.error(`Fetch error for ${url}: ${fetchError}`);

      // Special handling for JSDOM "NotYetImplemented" errors
      const errorStr = String(fetchError);
      if (errorStr.includes("NotYetImplemented")) {
        console.log(`JSDOM limitation detected for ${url}, attempting direct fetch fallback...`);
      }

      // Try another simple fetch without smartFetch as a last resort
      try {
        const response = await fetch(url);
        if (response.ok) {
          html = await response.text();
          status = response.status;
          const newHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            newHeaders[key] = value;
          });
          headers = newHeaders;
          console.log(`Recovered content via basic fetch for ${url}`);

          // If we got content and it was a NotYetImplemented JSDOM error, let's not mark it as a failure
          if (html && html.length > 0 && errorStr.includes("NotYetImplemented")) {
            fetchError = null;
            console.log(`Successfully recovered content for ${url} despite JSDOM limitations`);
          }
        }
      } catch (e) {
        // At this point we'll proceed with whatever HTML we have, even if empty
        console.error(`Basic fetch also failed for ${url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Proceed with whatever HTML we have, even if it's empty
    // Process the content based on requested formats
    const result: ScrapeResult = {
      success: !fetchError, // Mark as unsuccessful if we had a fetch error
      data: {}, // This empty object is initialized but needs to be populated
    };

    // Include fetch error if one occurred
    if (fetchError) {
      result.error = `Fetch issue: ${fetchError}`;
    }

    // Call beforeTransform hook if provided
    if (options.beforeTransform) {
      options.beforeTransform(result);
      // Exit early if hook changed success status to false
      if (!result.success) {
        return result;
      }
    }

    // Process metadata
    if (extractMetadataFlag && result.data) {
      result.data.metadata = extractMetadata(html, url, status);
    } else if (result.data) {
      result.data.metadata = {
        sourceURL: url,
        statusCode: status,
      };
    }

    // Track if we've generated markdown to avoid redundant processing
    let markdownGenerated = false;

    // Check if we'll need markdown for multiple purposes (formats or extraction)
    const needsMarkdown = formats.includes("markdown") ||
      (formats.includes("extract") && options.extractOptions);

    // Process links early if needed for both links format and extraction
    if (extractLinksFlag && result.data) {
      result.data.links = extractLinks(html, url);
    }

    // Process formats with optimization to avoid redundant work
    for (const format of formats) {
      if (!result.data) continue;

      switch (format) {
        case "markdown": {
          // Check if we've already generated markdown for this page
          const markdownCacheKey = `markdown:${url}:${html.length}`;
          let markdown = markdownCache.get(markdownCacheKey);

          if (!markdown) {
            markdown = convertHtmlToMarkdown(html);
            markdownCache.set(markdownCacheKey, markdown);
          }

          result.data.markdown = markdown;
          markdownGenerated = true;
          break;
        }
        case "html":
          // Clean HTML for better readability - only do this work if needed
          result.data.html = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
          break;
        case "rawHtml":
          result.data.rawHtml = html;
          break;
        case "links":
          // Links were already extracted above if needed
          break;
        case "extract":
          if (options.extractOptions) {
            try {
              // Get markdown content for extraction if needed
              let markdown: string | undefined;

              if (markdownGenerated && result.data.markdown) {
                // Reuse already generated markdown
                markdown = result.data.markdown;
              } else {
                // Generate markdown if we haven't already
                const markdownCacheKey = `markdown:${url}:${html.length}`;
                markdown = markdownCache.get(markdownCacheKey);

                if (!markdown) {
                  markdown = convertHtmlToMarkdown(html);
                  markdownCache.set(markdownCacheKey, markdown);
                  markdownGenerated = true;
                }
              }

              if (!markdown || markdown.trim().length < 100) {
                console.warn(`Warning: Markdown content is too short (${markdown?.length || 0} chars) for extraction.`);
                result.data.extract = {
                  warning: "Content was too short for meaningful extraction",
                  url: url
                };
                continue;
              }

              // Check extraction cache before performing expensive LLM extraction
              const extractCacheKey = `extract:${url}:${options.extractOptions.model || "default"}:${markdown.length}`;
              const cachedExtract = extractionCache.get(extractCacheKey);

              if (cachedExtract) {
                result.data.extract = cachedExtract;
                if (process.env.DEBUG) {
                  console.log(`Using cached extraction result for ${url}`);
                }
                continue;
              }

              const extractResult = await extractStructuredData(markdown, options.extractOptions);

              if (extractResult.success && extractResult.data) {
                result.data.extract = extractResult.data;
                // Cache successful extractions
                extractionCache.set(extractCacheKey, extractResult.data);
              } else if (extractResult.error) {
                console.error(`Extraction error for ${url}: ${extractResult.error}`);
                // Still include raw response if available for debugging
                if (extractResult.rawResponse) {
                  result.data.extract = { _raw: extractResult.rawResponse };
                } else {
                  result.data.extract = {
                    error: extractResult.error,
                    url: url
                  };
                }
              } else {
                result.data.extract = {
                  notice: "No data was extracted",
                  url: url
                };
              }
            } catch (extractError) {
              console.error(`Exception during extraction for ${url}: ${extractError instanceof Error ? extractError.message : String(extractError)}`);
              result.data.extract = {
                error: `Extraction failed: ${extractError instanceof Error ? extractError.message : String(extractError)}`,
                url: url
              };
            }
          } else {
            // Placeholder for extraction with empty result
            result.data.extract = {};
          }
          break;
        case "screenshot":
          // Placeholder for screenshot functionality
          result.data.screenshot = "";
          break;
      }
    }

    // Check if we have enough meaningful data
    const hasContent =
      (result.data?.markdown && result.data.markdown.length > 100) ||
      (result.data?.links && result.data.links.length > 0) ||
      (result.data?.metadata && (result.data.metadata.title || result.data.metadata.description));

    // If we had a fetch error but still got useful content, mark as success
    if (fetchError && hasContent) {
      result.success = true;
      result.error = `Partial content retrieved despite fetch issues: ${fetchError}`;
    }

    // Call afterTransform hook if provided
    if (options.afterTransform) {
      options.afterTransform(result);
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: `Failed to scrape ${url}: ${error.message}`,
        data: {}, // Always include an empty data object, even in error cases
      };
    }
    return {
      success: false,
      error: `Failed to scrape ${url}: Unknown error`,
      data: {}, // Always include an empty data object, even in error cases
    };
  }
}

/**
 * Batch scrapes multiple URLs
 */
export async function batchScrapeUrls(
  urls: string[],
  options: ScrapeOptions = {},
): Promise<{
  success: boolean;
  error?: string;
  data: Array<NonNullable<ScrapeResult["data"]>>;
}> {
  const results: Array<NonNullable<ScrapeResult["data"]>> = [];
  const errors: string[] = [];

  // Group URLs by domain to optimize fetching
  const domainGroups = new Map<string, string[]>();

  for (const url of urls) {
    try {
      const domain = new URL(url).hostname;
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)?.push(url);
    } catch {
      // If URL parsing fails, just add to a default group
      if (!domainGroups.has("_invalid_")) {
        domainGroups.set("_invalid_", []);
      }
      domainGroups.get("_invalid_")?.push(url);
    }
  }

  // Process domains in parallel, but URLs within a domain sequentially
  // to avoid overwhelming any single domain
  const domainPromises = Array.from(domainGroups.entries()).map(
    async ([domain, domainUrls]) => {
      if (process.env.DEBUG) {
        console.log(`Processing ${domainUrls.length} URLs from domain: ${domain}`);
      }

      // Add delay between requests to the same domain
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (const url of domainUrls) {
        try {
          const result = await scrapeUrl(url, options);
          if (result.success && result.data) {
            results.push(result.data);
          } else if (result.error) {
            errors.push(result.error);
          }

          // Add small delay between requests to same domain
          if (domainUrls.length > 1) {
            await delay(200); // 200ms delay between requests to same domain
          }
        } catch (error) {
          if (error instanceof Error) {
            errors.push(`Failed to scrape ${url}: ${error.message}`);
          } else {
            errors.push(`Failed to scrape ${url}: Unknown error`);
          }
        }
      }
    }
  );

  // Wait for all domain groups to complete
  await Promise.all(domainPromises);

  return {
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    data: results,
  };
}
