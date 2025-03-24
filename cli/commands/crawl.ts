/**
 * NimCrawl CLI - Crawl Command
 * 
 * Crawls a website starting from a URL
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseUrl } from "node:url";
import { Command } from "commander";
import { crawl } from "../../src/index.js";
import type { CrawlOptions, CrawlResult, OutputFormat, ScrapeResult } from "../../src/types/index.js";
import { addConcurrencyOptions, addFormatOptions, parseFormatOption, writeOutput } from "../utils/options.js";

// Helper function to ensure output directory exists
function ensureOutputDir(dir?: string): string {
  const outputDir = dir ? path.resolve(dir) : path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

// Helper function to generate filename from URL
function filenameFromUrl(url: string, format: string): string {
  return `${url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()}.${format}`;
}

/**
 * Creates and returns the crawl command
 */
export function createCrawlCommand(): Command {
  const crawlCommand = new Command("crawl")
    .description("Crawl a website starting from a URL")
    .argument("<url>", "Starting URL to crawl from")
    .option("--max-depth <number>", "Maximum crawl depth", "3")
    .option("--max-pages <number>", "Maximum number of pages to crawl", "100")
    .option("--include <pattern...>", "URL patterns to include (glob)")
    .option("--exclude <pattern...>", "URL patterns to exclude (glob)")
    .option("--external", "Allow crawling external domains", false)
    .action(async (url: string, options) => {
      try {
        // Validate the URL
        let startUrl = url;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          startUrl = `https://${url}`;
        }

        try {
          parseUrl(startUrl);
        } catch (error) {
          console.error(`Invalid URL: ${url}`);
          process.exit(1);
        }

        console.log(`Starting crawl from ${startUrl}`);
        console.log(`Max depth: ${options.maxDepth}, Max pages: ${options.maxPages}`);

        // Ensure output directory exists
        const outputDir = ensureOutputDir(options.dir);

        // Build crawl options
        const crawlOptions: CrawlOptions = {
          maxDepth: Number.parseInt(options.maxDepth, 10),
          maxPages: Number.parseInt(options.maxPages, 10),
          allowExternalDomains: Boolean(options.external),
          concurrency: Number.parseInt(options.concurrency || "5", 10),
          domainDelay: Number.parseInt(options.domainDelay || "200", 10),
          domainConcurrency: Number.parseInt(options.domainConcurrency || "2", 10),
          formats: []
        };

        // Add patterns if specified
        if (options.include && options.include.length > 0) {
          crawlOptions.includePatterns = options.include;
        }

        if (options.exclude && options.exclude.length > 0) {
          crawlOptions.excludePatterns = options.exclude;
        }

        // Add formats based on options
        if (options.format) {
          const formats = parseFormatOption(options.format);
          const outputFormats: OutputFormat[] = [];

          for (const format of formats) {
            switch (format) {
              case "markdown":
                outputFormats.push("markdown");
                break;
              case "html":
                outputFormats.push("html");
                break;
              case "json":
                // For JSON output, we still need markdown content to convert
                outputFormats.push("markdown");
                break;
              case "links":
                outputFormats.push("links");
                break;
            }
          }

          crawlOptions.formats = outputFormats;
        } else {
          // Legacy options support
          if (options.markdown) {
            if (!crawlOptions.formats) crawlOptions.formats = [];
            crawlOptions.formats.push("markdown");
          }
          if (options.html) {
            if (!crawlOptions.formats) crawlOptions.formats = [];
            crawlOptions.formats.push("html");
          }
          if (options.links) {
            if (!crawlOptions.formats) crawlOptions.formats = [];
            crawlOptions.formats.push("links");
          }

          // Default to markdown if no format specified
          if (!crawlOptions.formats || crawlOptions.formats.length === 0) {
            crawlOptions.formats = ["markdown"];
          }
        }

        // Add the afterTransform hook for saving files as they're processed
        if (options.dir) {
          crawlOptions.afterTransform = async (result: ScrapeResult) => {
            if (result.success && result.data?.metadata?.sourceURL) {
              const url = result.data.metadata.sourceURL;
              const formats = options.format ? parseFormatOption(options.format) : ["markdown"];

              // Save in each requested format
              for (const format of formats) {
                try {
                  let content: string | undefined;
                  let extension: string;

                  switch (format) {
                    case "markdown":
                      content = result.data.markdown;
                      extension = "md";
                      break;
                    case "html":
                      content = result.data.html;
                      extension = "html";
                      break;
                    case "json":
                      content = JSON.stringify(result.data, null, 2);
                      extension = "json";
                      break;
                    case "links":
                      content = JSON.stringify(result.data.links || [], null, 2);
                      extension = "json";
                      break;
                    default:
                      continue;
                  }

                  if (content) {
                    const filename = path.join(
                      outputDir,
                      `${url
                        .replace(/^https?:\/\//, "")
                        .replace(/[^a-z0-9]/gi, "_")
                        .toLowerCase()}.${extension}`
                    );

                    await fs.promises.writeFile(filename, content, "utf-8");
                    console.log(`💾 Saved: ${filename}`);
                  }
                } catch (error) {
                  console.error(`Error saving ${url} in ${format} format:`, error);
                }
              }
            }
            return result;
          };
        }

        console.log("Starting crawl...");
        const result = await crawl(startUrl, crawlOptions);

        // Consider the crawl successful if at least some pages were processed successfully
        // even if there were some errors
        if (result.completed > 0) {
          console.log(`Crawl completed. Processed ${result.completed} pages.`);

          if (result.error) {
            console.log("Note: Some pages failed to process with errors. This is normal for broken links.");
          }

          // Only write summary output for non-directory output modes
          if (!options.dir) {
            // For crawl results, we want to extract the first page's data for direct output
            // For multi-page results, all pages will be saved when using --dir
            const firstPageData = result.data[0] || {};

            await writeOutput(
              {
                status: result.status,
                total: result.total,
                completed: result.completed,
                // Include all available formats from the first page for direct display
                ...(firstPageData.markdown ? { markdown: firstPageData.markdown } : {}),
                ...(firstPageData.html ? { html: firstPageData.html } : {}),
                ...(firstPageData.links ? { links: firstPageData.links } : {}),
                // Keep the full data array for directory output
                data: result.data,
              },
              {
                ...options,
                url: startUrl
              }
            );
          }
        } else {
          console.error(`Crawl failed: ${result.error || "No pages were successfully processed"}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Add common options
  addFormatOptions(crawlCommand);
  addConcurrencyOptions(crawlCommand);

  return crawlCommand;
} 