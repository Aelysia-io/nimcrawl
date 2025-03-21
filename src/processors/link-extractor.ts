/**
 * Link Extractor
 *
 * Extracts links from HTML content
 */

import * as cheerio from "cheerio";

/**
 * Normalizes URLs and resolves relative URLs against a base URL
 */
export function normalizeUrl(url: string, baseUrl: string): string {
  try {
    // Handle URLs that are already absolute
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // Handle hash links (internal page navigation)
    if (url.startsWith("#")) {
      return `${baseUrl}${url}`;
    }

    // Resolve other relative URLs
    const base = new URL(baseUrl);
    return new URL(url, base).toString();
  } catch (error) {
    console.error(
      `Failed to normalize URL ${url} with base ${baseUrl}:`,
      error,
    );
    return url; // Return original URL if normalization fails
  }
}

/**
 * Extracts all links from the HTML content
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  // Extract links from anchor tags
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (
      href &&
      !href.startsWith("javascript:") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:")
    ) {
      try {
        const normalizedUrl = normalizeUrl(href, baseUrl);
        links.add(normalizedUrl);
      } catch (error) {
        // Ignore invalid URLs
      }
    }
  });

  return Array.from(links);
}

/**
 * Filters links based on various criteria
 */
export function filterLinks(
  links: string[],
  baseUrl: string,
  options: {
    includePatterns?: string[];
    excludePatterns?: string[];
    allowExternalDomains?: boolean;
  } = {},
): string[] {
  const baseUrlObj = new URL(baseUrl);
  const baseDomain = baseUrlObj.hostname;

  // Default include pattern if none provided
  const includePatterns = options.includePatterns?.length
    ? options.includePatterns
    : ["*"]; // Default to include everything if no patterns provided

  // Debug info
  if (process.env.DEBUG) {
    console.log(`🧠 Filtering ${links.length} links from ${baseUrl}`);
    console.log(`🧠 Include patterns: ${JSON.stringify(includePatterns)}`);
    console.log(`🧠 Exclude patterns: ${JSON.stringify(options.excludePatterns)}`);
    console.log(`🧠 Allow external domains: ${options.allowExternalDomains}`);
  }

  const filteredLinks = links.filter((link) => {
    try {
      const url = new URL(link);
      let shouldInclude = true;
      let debugReason = "";

      // Check if external domain is allowed
      if (!options.allowExternalDomains && url.hostname !== baseDomain) {
        if (process.env.DEBUG) {
          debugReason = `External domain ${url.hostname} != ${baseDomain}`;
        }
        return false;
      }

      // Check include patterns - if ANY pattern matches, include the link
      if (includePatterns.length > 0) {
        const matchesInclude = includePatterns.some((pattern) => {
          // Wildcard matches everything
          if (pattern === "*") return true;

          // Pattern with wildcard
          if (pattern.includes("*")) {
            const regexPattern = pattern
              .replace(/\./g, "\\.")  // Escape dots
              .replace(/\*/g, ".*");  // Convert * to .*
            const regex = new RegExp(regexPattern);
            const matches = regex.test(link);

            if (process.env.DEBUG && matches) {
              console.log(`✅ URL ${link} matched include pattern ${pattern}`);
            }

            return matches;
          }

          // Simple substring match
          const matches = link.includes(pattern);
          if (process.env.DEBUG && matches) {
            console.log(`✅ URL ${link} matched substring pattern ${pattern}`);
          }
          return matches;
        });

        if (!matchesInclude) {
          if (process.env.DEBUG) {
            debugReason = `Didn't match any include patterns`;
          }
          shouldInclude = false;
        }
      }

      // Check exclude patterns - if ANY pattern matches, exclude the link
      if (shouldInclude && options.excludePatterns && options.excludePatterns.length > 0) {
        const matchesExclude = options.excludePatterns.some((pattern) => {
          // Pattern with wildcard
          if (pattern.includes("*")) {
            const regexPattern = pattern
              .replace(/\./g, "\\.")  // Escape dots
              .replace(/\*/g, ".*");  // Convert * to .*
            const regex = new RegExp(regexPattern);
            const matches = regex.test(link);

            if (process.env.DEBUG && matches) {
              console.log(`❌ URL ${link} matched exclude pattern ${pattern}`);
              debugReason = `Matched exclude pattern ${pattern}`;
            }

            return matches;
          }

          // Simple substring match
          const matches = link.includes(pattern);
          if (process.env.DEBUG && matches) {
            console.log(`❌ URL ${link} matched exclude substring ${pattern}`);
            debugReason = `Matched exclude substring ${pattern}`;
          }
          return matches;
        });

        if (matchesExclude) {
          shouldInclude = false;
        }
      }

      if (process.env.DEBUG && !shouldInclude) {
        console.log(`🚫 Filtered out ${link}: ${debugReason}`);
      }

      return shouldInclude;
    } catch (error) {
      // Skip invalid URLs
      if (process.env.DEBUG) {
        console.log(`⚠️ Invalid URL: ${link}, Error: ${error}`);
      }
      return false;
    }
  });

  // Log filtering results
  if (process.env.DEBUG) {
    console.log(`🧠 Filtered from ${links.length} to ${filteredLinks.length} links`);
  }

  return filteredLinks;
}

