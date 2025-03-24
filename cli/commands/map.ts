/**
 * NimCrawl CLI - Map Command
 * 
 * Maps a website and returns URLs
 */

import { parse as parseUrl } from "node:url";
import { Command } from "commander";
import { map } from "../../src/index.js";
import { writeOutput } from "../utils/options.js";

/**
 * Creates and returns the map command
 */
export function createMapCommand(): Command {
  const mapCommand = new Command("map")
    .description("Map a website and list all URLs")
    .argument("<url>", "Starting URL to map from")
    .option("--max-depth <number>", "Maximum crawl depth", "3")
    .option("--include <pattern...>", "URL patterns to include (glob)")
    .option("--exclude <pattern...>", "URL patterns to exclude (glob)")
    .option("--external", "Allow crawling external domains", false)
    .option("--search <query>", "Search for specific keywords in pages")
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

        console.log(`Mapping site: ${startUrl}`);
        console.log(`Max depth: ${options.maxDepth}`);

        // Build map options
        const mapOptions = {
          maxDepth: Number.parseInt(options.maxDepth, 10),
          allowExternalDomains: Boolean(options.external),
          includePatterns: options.include,
          excludePatterns: options.exclude,
          search: options.search
        };

        console.log("Starting site mapping...");
        const result = await map(startUrl, mapOptions);

        if (result.success) {
          console.log(`Mapping completed. Found ${result.links.length} URLs.`);
          await writeOutput(
            {
              url: startUrl,
              count: result.links.length,
              links: result.links,
            },
            {
              ...options,
              url: startUrl
            }
          );
        } else {
          console.error(`Mapping failed: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return mapCommand;
} 