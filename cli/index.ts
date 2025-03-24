#!/usr/bin/env bun
/**
 * NimCrawl CLI
 * 
 * Command-line interface for NimCrawl scraper and crawler
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

import { createCrawlCommand } from "./commands/crawl.js";
import { createExtractCommand } from "./commands/extract.js";
import { createMapCommand } from "./commands/map.js";
// Import command factories
import { createScrapeCommand } from "./commands/scrape.js";
import { createSummarizeCommand } from "./commands/summarize.js";

// Get package info for versioning
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

// Create program
const program = new Command();

program
  .name("nimcrawl")
  .description("NimCrawl - A highly efficient web scraper and crawler")
  .version(packageJson.version || "0.1.0");

// Add commands
program.addCommand(createScrapeCommand());
program.addCommand(createCrawlCommand());
program.addCommand(createMapCommand());
program.addCommand(createExtractCommand());
program.addCommand(createSummarizeCommand());

// Run the CLI
await program.parseAsync(process.argv);

// If no commands were provided, show help
if (process.argv.length <= 2) {
  program.help();
}

// Ensure the process exits cleanly
process.exit(0); 