/**
 * NimCrawl CLI - Extract Command
 * 
 * Extracts structured data from URLs using LLMs
 */

import * as fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { scrape } from "../../src/index.js";
import type { OutputFormat, ScrapeOptions, ScrapeResult } from "../../src/types/index.js";
import type { ExtractionSchema } from "../../src/utils/llm-processor";
import { addLLMOptions, writeOutput } from "../utils/options.js";

// Helper function to ensure output directory exists
function ensureOutputDir(dir?: string): string {
  const outputDir = dir ? path.resolve(dir) : path.join(process.cwd(), "output");
  if (!fsSync.existsSync(outputDir)) {
    fsSync.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

/**
 * Creates and returns the extract command
 */
export function createExtractCommand(): Command {
  const extractCommand = new Command("extract")
    .description("Extract structured data from URLs using LLMs")
    .argument("<url>", "URL to scrape and extract data from")
    .option("--schema <file>", "JSON schema file for extraction")
    .option("--system-prompt <file>", "File containing system prompt")
    .option("--prompt <file>", "File containing custom prompt")
    .option("--temperature <value>", "Temperature for LLM generation", Number.parseFloat)
    .option("--top-p <value>", "Top-p value for LLM generation", Number.parseFloat)
    .option("--dir <dir>", "Output directory for saved files")
    .action(async (url: string, options) => {
      try {
        // Validate URL
        try {
          new URL(url);
        } catch (error) {
          console.error(`Invalid URL: ${url}`);
          process.exit(1);
        }

        console.log(`Scraping and extracting data from ${url}...`);

        // Ensure output directory exists if using --dir
        const outputDir = options.dir ? ensureOutputDir(options.dir) : undefined;

        // Load schema if provided
        let schema: ExtractionSchema | undefined;
        if (options.schema) {
          try {
            const schemaContent = await fs.readFile(options.schema, "utf-8");
            schema = JSON.parse(schemaContent);
          } catch (error) {
            console.error(`Error reading schema file: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
          }
        }

        // Load prompts if provided
        let systemPrompt: string | undefined;
        if (options.systemPrompt) {
          try {
            systemPrompt = await fs.readFile(options.systemPrompt, "utf-8");
          } catch (error) {
            console.error(`Error reading system prompt file: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
          }
        }

        let prompt: string | undefined;
        if (options.prompt) {
          try {
            prompt = await fs.readFile(options.prompt, "utf-8");
          } catch (error) {
            console.error(`Error reading prompt file: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
          }
        }

        // Configure model options
        const modelOptions: Record<string, number> = {};
        if (options.temperature !== undefined) modelOptions.temperature = options.temperature;
        if (options.topP !== undefined) modelOptions.top_p = options.topP;

        // Build scrape options with extraction
        const scrapeOptions: ScrapeOptions = {
          formats: ["markdown", "extract"] as OutputFormat[],
          extractOptions: {
            schema,
            systemPrompt,
            prompt,
            model: options.model || undefined,
            ollamaHost: options.ollamaHost || undefined,
            modelOptions
          }
        };

        // Set up the afterTransform hook to save files incrementally if dir option is provided
        if (outputDir) {
          scrapeOptions.afterTransform = async (result: ScrapeResult) => {
            if (result.success && result.data) {
              try {
                // Generate base filename from URL
                const urlObj = new URL(url);
                const hostname = urlObj.hostname.replace(/\./g, "_");
                const pathname = urlObj.pathname.replace(/\//g, "_").replace(/^_/, "");
                const basename = `${hostname}${pathname || "_home"}`;

                // Save the markdown content
                if (result.data.markdown) {
                  const markdownFilename = path.join(outputDir, `${basename}.md`);
                  await fs.writeFile(markdownFilename, result.data.markdown, "utf-8");
                  console.log(`💾 Saved markdown content to: ${markdownFilename}`);
                }

                // Save the extracted data
                if (result.data.extract) {
                  const extractedFilename = path.join(outputDir, `${basename}_extracted.json`);
                  await fs.writeFile(
                    extractedFilename,
                    JSON.stringify(result.data.extract, null, 2),
                    "utf-8"
                  );
                  console.log(`💾 Saved extracted data to: ${extractedFilename}`);
                }
              } catch (error) {
                console.error(`Error saving results: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          };
        }

        console.log("Starting scraping and extraction...");
        const result = await scrape(url, scrapeOptions);

        if (result.success) {
          console.log("Scraping and extraction successful");

          // If not using directory output, write to stdout or file based on options
          if (!outputDir && result.data) {
            await writeOutput(result.data, options);
          }

          // Display extraction results
          if (result.data?.extract) {
            if (result.data.extract._error) {
              console.log(`⚠️ Extraction encountered an issue: ${result.data.extract._error}`);

              if (String(result.data.extract._error).includes("connection")) {
                console.log("📌 To use LLM extraction, install Ollama from https://ollama.com/");
                console.log("   and start it with 'ollama serve'");
              }

              if (String(result.data.extract._error).includes("Model")) {
                console.log(`📌 Run: ollama pull ${options.model || "a suitable model"}`);
              }
            } else {
              console.log("🔍 Extracted structured data successfully");
            }
          }
        } else {
          console.error(`Scraping failed: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Add LLM options
  addLLMOptions(extractCommand);

  return extractCommand;
} 