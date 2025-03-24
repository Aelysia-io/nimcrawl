/**
 * NimCrawl CLI - Summarize Command
 * 
 * Summarizes content using LLMs
 */

import fs from "node:fs/promises";
import { Command } from "commander";
import { summarize } from "../../src/index.js";
import { addLLMOptions, writeOutput } from "../utils/options.js";

/**
 * Creates and returns the summarize command
 */
export function createSummarizeCommand(): Command {
  const summarizeCommand = new Command("summarize")
    .description("Summarize content using LLMs")
    .argument("<file>", "File containing content to summarize")
    .action(async (file: string, options) => {
      try {
        // Read input file
        let content: string;
        try {
          content = await fs.readFile(file, "utf-8");
        } catch (error) {
          console.error(`Error reading input file: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }

        // Validate content
        if (!content || content.trim().length < 200) {
          console.error("Content is too short for meaningful summarization");
          process.exit(1);
        }

        console.log(`Summarizing content from ${file} (${content.length} characters)`);
        console.log(`Max length: ${options.maxLength || 200} words`);

        // Build summarize options
        const summarizeOptions = {
          maxLength: Number.parseInt(options.maxLength || "200", 10),
          model: options.model || undefined,
          ollamaHost: options.ollamaHost || undefined
        };

        console.log("Starting summarization...");
        const result = await summarize(content, summarizeOptions);

        if (result.success) {
          console.log("Summarization successful");
          await writeOutput(
            {
              sourceFile: file,
              contentLength: content.length,
              summary: result.summary
            },
            options
          );
        } else {
          console.error(`Summarization failed: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Add LLM options
  addLLMOptions(summarizeCommand);

  return summarizeCommand;
} 