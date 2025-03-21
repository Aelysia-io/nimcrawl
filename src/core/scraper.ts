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
import { smartFetch } from "./fetcher";

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
    const useJsdom = options.useJsdom ?? false;
    const extractMetadataFlag = options.extractMetadata ?? true;
    const extractLinksFlag = options.extractLinks ?? true;

    // Fetch the content
    const { html, status, headers, usedJsdom } = await smartFetch(url, {
      // Pass location headers if provided
      headers: options.location
        ? {
          "Accept-Language": options.location.languages?.join(",") || "en-US",
        }
        : undefined,
    });

    // Process the content based on requested formats
    let result: ScrapeResult = {
      success: true,
      data: {},
    };

    // Call beforeTransform hook if provided
    if (options.beforeTransform) {
      result = await Promise.resolve(options.beforeTransform(result));

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

    // Process formats
    for (const format of formats) {
      if (!result.data) continue;

      switch (format) {
        case "markdown":
          result.data.markdown = convertHtmlToMarkdown(html);
          break;
        case "html":
          // Clean HTML for better readability
          result.data.html = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
          break;
        case "rawHtml":
          result.data.rawHtml = html;
          break;
        case "links":
          if (extractLinksFlag) {
            result.data.links = extractLinks(html, url);
          }
          break;
        case "extract":
          // Placeholder for LLM-based extraction (to be implemented)
          result.data.extract = {};
          break;
        case "screenshot":
          // Placeholder for screenshot functionality
          result.data.screenshot = "";
          break;
      }
    }

    // Call afterTransform hook if provided
    if (options.afterTransform) {
      result = await Promise.resolve(options.afterTransform(result));
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: `Failed to scrape ${url}: ${error.message}`,
      };
    }
    return {
      success: false,
      error: `Failed to scrape ${url}: Unknown error`,
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

  // Process URLs in parallel with a concurrency limit
  const promises = urls.map((url) =>
    (async () => {
      try {
        const result = await scrapeUrl(url, options);
        if (result.success && result.data) {
          results.push(result.data);
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
    })(),
  );

  // Wait for all scraping to complete
  await Promise.all(promises);

  return {
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    data: results,
  };
}
