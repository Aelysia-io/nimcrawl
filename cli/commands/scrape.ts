/**
 * NimCrawl CLI - Scrape Command
 * 
 * Scrapes content from URLs and outputs formatted content
 */

import fs from "node:fs";
import path from "node:path";
import { parse as parseUrl } from "node:url";
import { Command } from "commander";
import { batchScrape, scrape } from "../../src/index.js";
import type { OutputFormat, ScrapeOptions, ScrapeResult } from "../../src/types/index.js";
import { addFormatOptions, addLLMOptions, parseFormatOption, writeOutput } from "../utils/options.js";

// Helper function to ensure output directory exists
function ensureOutputDir(dir?: string): string {
  const outputDir = dir ? path.resolve(dir) : path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

/**
 * Creates and returns the scrape command
 */
export function createScrapeCommand(): Command {
  const scrapeCommand = new Command("scrape")
    .description("Scrape content from one or more URLs")
    .argument("[urls...]", "URLs to scrape (can also be read from a file with --input)")
    .option("--input <file>", "Read URLs from a file (one URL per line)")
    .action(async (urls: string[], options) => {
      try {
        // Load URLs from file if specified
        let urlList = [...urls];

        if (options.input) {
          try {
            const content = await fs.promises.readFile(options.input, "utf-8");
            const fileUrls = content
              .split("\n")
              .map(line => line.trim())
              .filter(line => line && !line.startsWith("#"));
            urlList = [...urlList, ...fileUrls];
          } catch (error) {
            console.error(`Error reading input file: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
          }
        }

        // Validate we have URLs to process
        if (urlList.length === 0) {
          console.error("No URLs specified. Use 'scrape [urls...]' or 'scrape --input <file>'");
          process.exit(1);
        }

        // Validate URLs
        const validUrls: string[] = [];
        for (const url of urlList) {
          try {
            // Make sure URL has a protocol
            let normalizedUrl = url;
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
              normalizedUrl = `https://${url}`;
            }

            // Try to parse URL
            parseUrl(normalizedUrl);
            validUrls.push(normalizedUrl);
          } catch (error) {
            console.warn(`Skipping invalid URL: ${url}`);
          }
        }

        console.log(`Scraping ${validUrls.length} URLs...`);

        // Ensure output directory exists if using --dir
        const outputDir = options.dir ? ensureOutputDir(options.dir) : undefined;

        // Build scrape options
        const scrapeOptions: ScrapeOptions = {
          formats: [] as OutputFormat[],
          extractMetadata: true,
          extractLinks: Boolean(options.links)
        };

        // Convert format option to formats array
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

          scrapeOptions.formats = outputFormats;
        } else {
          // Legacy options support
          if (options.markdown) {
            if (!scrapeOptions.formats) scrapeOptions.formats = [];
            scrapeOptions.formats.push("markdown");
          }
          if (options.html) {
            if (!scrapeOptions.formats) scrapeOptions.formats = [];
            scrapeOptions.formats.push("html");
          }
          if (options.links) {
            if (!scrapeOptions.formats) scrapeOptions.formats = [];
            scrapeOptions.formats.push("links");
          }

          // Default to markdown if no format specified
          if (!scrapeOptions.formats || scrapeOptions.formats.length === 0) {
            scrapeOptions.formats = ["markdown"];
          }
        }

        // Add LLM extraction options if requested
        if (options.extract) {
          scrapeOptions.extractOptions = {
            model: options.model || undefined,
            ollamaHost: options.ollamaHost || undefined
          };
        }

        // Add the afterTransform hook for saving files as they're processed
        if (options.dir) {
          scrapeOptions.afterTransform = async (result: ScrapeResult) => {
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

                  if (content && outputDir) {
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

        // Scrape single URL or batch
        let result: ScrapeResult | { success: boolean; error?: string; data: Array<NonNullable<ScrapeResult["data"]>> };
        if (validUrls.length === 1 && validUrls[0]) {
          result = await scrape(validUrls[0], scrapeOptions);
        } else {
          result = await batchScrape(validUrls, scrapeOptions);
        }

        // Write final output only if not using directory output
        if (result.success) {
          if (!options.dir) {
            await writeOutput(
              validUrls.length === 1 ? { ...result.data } as Record<string, unknown> : { urls: validUrls, results: result.data },
              {
                ...options,
                url: validUrls.length === 1 ? validUrls[0] : undefined,
                urls: validUrls.length > 1 ? validUrls : undefined
              }
            );
          } else {
            console.log(`Scrape completed. All files saved to ${outputDir}`);
          }
        } else {
          console.error(`Scrape failed: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Add common options
  addFormatOptions(scrapeCommand);
  addLLMOptions(scrapeCommand);

  return scrapeCommand;
} 