This file is a merged representation of a subset of the codebase, containing files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching these patterns are excluded: **/*.md, **/*.mdc, **/*.txt
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded

## Additional Info

# Directory Structure
```
examples/
  basic-scrape.ts
  batch-scrape.ts
  content-summarization.ts
  crawl-site.ts
  custom-extraction.ts
  hooks-example.ts
  javascript-sites.ts
  llm-extraction.ts
  site-mapping.ts
src/
  core/
    crawler.ts
    fetcher.ts
    scraper.ts
  processors/
    html-to-markdown.ts
    link-extractor.ts
    metadata-extractor.ts
  types/
    index.ts
  utils/
    cache.ts
    llm-processor.ts
    markdown-merger.ts
    rate-limiter.ts
    test-server.ts
  index.ts
.gitignore
biome.json
bun.lock
package.json
tsconfig.json
```

# Files

## File: examples/basic-scrape.ts
```typescript
/**
 * Basic Scraping Example
 *
 * This example demonstrates how to scrape a single URL and extract
 * different formats of data including markdown, HTML, and links.
 */

import { scrape } from "../src/index";

async function basicScrapeExample() {
	console.log("🔍 Basic scraping example");

	// Define a list of URLs to try - starting with static sites that don't need JavaScript
	const urls = [
		"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta",
		"https://github.com", // This site should work better than bun.sh which has JSDOM limitations
	];

	// Try scraping each URL
	for (const url of urls) {
		console.log(`\n🌐 Scraping ${url}...`);

		// Simple scrape with multiple output formats
		const result = await scrape(url, {
			formats: ["markdown"],
			extractMetadata: true,
			afterTransform(result) {
				if (!result.data?.markdown) return result;
				Bun.write(`output/${url.split("/").pop()}.md`, result.data.markdown);
			}
		});

		if (result.success && result.data) {
			console.log("✅ Scrape successful");

			// Display metadata
			if (result.data.metadata) {
				console.log("\n📝 Metadata:");
				console.log(`Title: ${result.data.metadata.title}`);
				console.log(`Description: ${result.data.metadata.description}`);
				console.log(`Language: ${result.data.metadata.language}`);
				console.log(`Site Name: ${result.data.metadata.siteName}`);
			}

			// Display links
			if (result.data.links && result.data.links.length > 0) {
				console.log("\n🔗 Links found:");
				for (const link of result.data.links.slice(0, 5)) {
					console.log(`- ${link}`);
				}
				if (result.data.links.length > 5) {
					console.log(`... and ${result.data.links.length - 5} more links`);
				}
			}

			// Show markdown preview
			if (result.data.markdown) {
				console.log("\n📄 Markdown preview:");
				console.log(`${result.data.markdown.substring(0, 300)}...`);
			}
		} else {
			console.error("❌ Scrape failed:", result.error);
		}
	}
}

// Run the example if this file is executed directly
if (import.meta.main) {
	basicScrapeExample()
		.catch((error) => console.error("Error:", error))
		.finally(() => {
			// Ensure the process terminates by explicitly exiting
			// This helps if there are any hanging connections or processes
			setTimeout(() => {
				process.exit(0);
			}, 100);
		});
}
```

## File: examples/batch-scrape.ts
```typescript
/**
 * Batch Scraping Example
 *
 * This example demonstrates how to scrape multiple URLs in parallel
 * and process the results efficiently.
 */

import { batchScrape } from "../src/index";

async function batchScrapeExample() {
	console.log("🔍 Batch scraping example");

	// List of URLs to scrape
	const urls = [
		"https://example.com",
		"https://mozilla.org",
		"https://bun.sh",
		"https://github.com",
	];

	// Scrape multiple URLs in parallel
	const result = await batchScrape(urls, {
		formats: ["markdown"],
		extractMetadata: true,
	});

	if (result.success) {
		console.log(
			`✅ Successfully scraped ${result.data.length}/${urls.length} URLs`,
		);

		// Process and display results
		for (let i = 0; i < result.data.length; i++) {
			const page = result.data[i];
			if (page) {
				console.log(`\n📌 Page ${i + 1}: ${urls[i]}`);
				console.log(`Title: ${page.metadata?.title || "Unknown"}`);

				if (page.markdown) {
					// Count words in the markdown content
					const wordCount = page.markdown.split(/\s+/).length;
					console.log(`Content length: ~${wordCount} words`);

					// Show a brief excerpt
					console.log(`Excerpt: ${page.markdown.substring(0, 150)}...`);
				}
			}
		}
	} else {
		console.error("❌ Batch scrape failed:", result.error);
	}
}

// Run the example if this file is executed directly
if (import.meta.main) {
	batchScrapeExample().catch((error) => console.error("Error:", error));
}
```

## File: examples/content-summarization.ts
```typescript
/**
 * Content Summarization Example
 *
 * This example demonstrates how to summarize web content
 * using local LLMs with Ollama integration.
 */

import { scrape, summarize } from "../src/index";

async function contentSummarizationExample() {
  console.log("📝 Content summarization example");

  // Check if Ollama is running
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch("http://127.0.0.1:11434/api/version", {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("❌ Ollama server is not running. Please start Ollama first.");
      console.log("   Install Ollama: https://ollama.com/download");
      console.log("   Start Ollama and make sure it's running on port 11434");
      process.exit(1);
    }

    const version = await response.json();
    console.log(`✅ Connected to Ollama version ${version.version}`);

    // Check available models
    const modelController = new AbortController();
    const modelTimeoutId = setTimeout(() => modelController.abort(), 5000); // 5 second timeout

    const modelsResponse = await fetch("http://127.0.0.1:11434/api/tags", {
      signal: modelController.signal
    });

    clearTimeout(modelTimeoutId);

    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      console.log("🧠 Available models:", modelsData.models.map((m: { name: string }) => m.name).join(", "));

      // Check if our target model is available
      const targetModel = "gemma3:27b";
      if (!modelsData.models.some((m: { name: string }) => m.name === targetModel)) {
        console.log(`⚠️ Target model "${targetModel}" not found. You can install it with:`);
        console.log(`   ollama pull ${targetModel}`);
        console.log("⚠️ Continuing with default model (this may not work)...");
      } else {
        console.log(`✅ Target model "${targetModel}" is available`);
      }
    }
  } catch (error) {
    console.error("❌ Could not connect to Ollama server. Is Ollama running?");
    console.log("   Install Ollama: https://ollama.com/download");
    console.log("   Start Ollama and make sure it's running on port 11434");
    process.exit(1);
    return;
  }

  // Define URLs to scrape and summarize
  const urls = [
    "https://bun.sh",
    "https://github.com/oven-sh/bun",
  ];

  console.log("🔄 Scraping and summarizing content from multiple URLs...");

  // Process each URL
  for (const url of urls) {
    console.log(`\n📌 Processing: ${url}`);

    // Scrape the URL to get content
    const result = await scrape(url, {
      formats: ["markdown"],
    });

    if (result.success && result.data?.markdown) {
      console.log(`✅ Successfully scraped content from ${url}`);

      // Count words to show content size
      const wordCount = result.data.markdown.split(/\s+/).length;
      console.log(`📊 Content length: ~${wordCount} words`);

      // Generate a summary using Ollama
      console.log("🤖 Generating summary...");
      const summaryResult = await summarize(result.data.markdown, {
        model: "gemma3:27b",
        maxLength: 150, // Limit summary to 150 words
        modelOptions: {
          temperature: 0.3, // Lower temperature for more deterministic results
          top_p: 0.9
        }
      });

      if (summaryResult.success && summaryResult.summary) {
        console.log("\n📝 Summary:");
        console.log(summaryResult.summary);

        // Calculate compression ratio
        const summaryWordCount = summaryResult.summary.split(/\s+/).length;
        const compressionRatio = ((wordCount - summaryWordCount) / wordCount * 100).toFixed(1);
        console.log(`\n📊 Compression: ${compressionRatio}% (${wordCount} → ${summaryWordCount} words)`);
      } else {
        console.error(`❌ Failed to generate summary: ${summaryResult.error}`);
        if (summaryResult.error?.includes("not found")) {
          console.log("   Try running: ollama pull gemma3:27b");
        }
      }
    } else {
      console.error(`❌ Failed to scrape ${url}: ${result.error}`);
    }
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  contentSummarizationExample().catch((error) => console.error("Error:", error))
    .finally(() => {
      console.log("Summarization process complete, exiting...");
      // Force process to exit after a short delay to allow any pending operations to complete
      setTimeout(() => process.exit(0), 100);
    });
}
```

## File: examples/crawl-site.ts
```typescript
/**
 * Website Crawling Example
 *
 * This example demonstrates how to crawl a website
 * to a specific depth and extract content from multiple pages.
 */

import { crawl } from "../src/index";

async function crawlWebsiteExample() {
	console.log("🕸️ Website crawling example");

	// Define the starting URL and crawl configuration
	const startUrl = "https://example.com";
	const result = await crawl(startUrl, {
		maxDepth: 2, // Only go 2 links deep
		maxPages: 10, // Limit to 10 pages maximum
		formats: ["markdown"], // Get markdown content
		includePatterns: ["*"], // Include all URLs
		excludePatterns: ["*.pdf", "*/download/*"], // Skip PDFs and downloads
		allowExternalDomains: false, // Stay on the same domain
	});

	if (result.success) {
		console.log(
			`✅ Crawl completed: Processed ${result.completed}/${result.total} pages`,
		);

		// Display a summary of the crawled pages
		console.log("\n📊 Crawl Summary:");
		console.log(`Status: ${result.status}`);
		console.log(`Total pages found: ${result.total}`);
		console.log(`Pages successfully crawled: ${result.completed}`);

		// Show details for each crawled page
		console.log("\n📑 Crawled Pages:");
		for (let i = 0; i < result.data.length; i++) {
			const page = result.data[i];
			if (page?.metadata) {
				console.log(`\n${i + 1}. ${page.metadata.sourceURL}`);
				console.log(`   Title: ${page.metadata.title || "No title"}`);
				console.log(`   Status: ${page.metadata.statusCode}`);

				// Show content length if available
				if (page.markdown) {
					const contentLength = page.markdown.length;
					console.log(`   Content size: ${contentLength} characters`);
				}
			}
		}
	} else {
		console.error("❌ Crawl failed:", result.error);
	}
}

// Run the example if this file is executed directly
if (import.meta.main) {
	crawlWebsiteExample().catch((error) => console.error("Error:", error));
}
```

## File: examples/custom-extraction.ts
```typescript
/**
 * Custom Data Extraction Example
 *
 * This example demonstrates how to extract structured data from websites
 * using a schema-based approach.
 */

import { scrape } from "../src/index";

async function customExtractionExample() {
  console.log("📊 Custom data extraction example");

  // Define a URL to scrape
  const url = "https://example.com";

  // Define a schema for data extraction
  const result = await scrape(url, {
    formats: ["extract"],
    extractMetadata: true,
  });

  // Process results
  if (result.success && result.data) {
    console.log("✅ Data extraction successful");

    // Display page metadata
    if (result.data.metadata) {
      console.log("\n📝 Page Metadata:");
      console.log(`Title: ${result.data.metadata.title || "N/A"}`);
      console.log(`URL: ${result.data.metadata.sourceURL}`);
    }

    // Display extracted structured data
    if (result.data.extract) {
      console.log("\n🔍 Extracted Data:");

      // Format the extracted data for display
      const extractedData = result.data.extract;
      for (const [key, value] of Object.entries(extractedData)) {
        if (typeof value === "object" && value !== null) {
          console.log(`${key}:`);
          for (const [subKey, subValue] of Object.entries(value)) {
            console.log(`  ${subKey}: ${formatValue(subValue)}`);
          }
          continue;
        }
        console.log(`${key}: ${formatValue(value)}`);
      }
      return;
    }
    console.log("❌ No structured data extracted");
    return;
  }
  console.error("❌ Extraction failed:", result.error);
}

// Helper function to format values for display
function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (typeof value === "object" && value !== null) {
    return "{Object}";
  }

  return String(value);
}

// Run the example if this file is executed directly
if (import.meta.main) {
  customExtractionExample().catch((error) => console.error("Error:", error));
}
```

## File: examples/hooks-example.ts
```typescript
/**
 * Hooks Example
 *
 * This example demonstrates how to use beforeTransform and afterTransform hooks
 * to process and save data during crawling.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type ScrapeResult, crawl } from "../src/index";

async function hooksExample() {
  console.log("🪝 Hooks example");

  // Enable debug mode
  process.env.DEBUG = "true";

  // Create a directory to save markdown files
  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Define the starting URL and crawl configuration
  const startUrl = "https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/index.html";

  console.log("Starting crawl with URL:", startUrl);

  try {
    // Set a timeout for the entire crawl process (3 minutes)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Crawl timed out after 3 minutes"));
      }, 3 * 60 * 1000);
    });

    // The crawl promise
    const crawlPromise = crawl(startUrl, {
      maxDepth: 2,
      maxPages: 200,
      formats: ["markdown", "links"],
      // Unity docs specific patterns - this is crucial
      includePatterns: [
        "com.unity.entities@1.4/*",
      ],
      allowExternalDomains: false,
      concurrency: 3, // Lower concurrency to avoid overwhelming

      // Before transform hook - runs before content is transformed
      beforeTransform: async (result: ScrapeResult) => {
        // Log which URL is being processed
        if (result.data?.metadata?.sourceURL) {
          console.log(`🔄 Processing: ${result.data.metadata.sourceURL}`);
        }
        // Small delay to ensure async nature
        await new Promise(resolve => setTimeout(resolve, 1));
        return result;
      },

      // After transform hook - runs after content is transformed
      afterTransform: async (result: ScrapeResult) => {
        // Log how many links were found
        if (result.data?.links) {
          console.log(`🔍 Found ${result.data.links.length} links on ${result.data?.metadata?.sourceURL}`);
          // Debug: Print the first few links
          const sampleLinks = result.data.links.slice(0, 5);
          console.log("Sample links:", sampleLinks);
        }

        // Save each page as a markdown file if it has markdown content
        if (result.data?.metadata?.sourceURL && result.data.markdown) {
          const url = result.data.metadata.sourceURL;
          const filename = path.join(
            outputDir,
            `${url
              .replace(/^https?:\/\//, "")
              .replace(/[^a-z0-9]/gi, "_")
              .toLowerCase()}.md`,
          );

          await fs.promises.writeFile(filename, result.data.markdown, "utf-8");
          console.log(`💾 Saved: ${filename}`);
        }
        return result;
      },
    });

    // Race between timeout and crawl
    const result = await Promise.race([
      crawlPromise,
      timeoutPromise as Promise<never>
    ]);

    if (result.success) {
      console.log(
        `✅ Crawl completed: Processed ${result.completed}/${result.total} pages`,
      );
      console.log(`📄 Total pages found: ${result.total}`);
      console.log(`📄 Pages successfully crawled: ${result.completed}`);

      // Display a list of crawled URLs
      console.log("\n📑 Crawled Pages:");
      for (let i = 0; i < result.data.length; i++) {
        const page = result.data[i];
        if (page?.metadata) {
          console.log(`${i + 1}. ${page.metadata.sourceURL}`);
        }
      }
    } else {
      console.error("❌ Crawl failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Error during crawl:", error instanceof Error ? error.message : String(error));
  } finally {
    // Explicitly exit the process to avoid hanging
    console.log("Crawl process complete, exiting...");
    process.exit(0);
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  hooksExample().catch((error) => console.error("Error:", error));
}
```

## File: examples/javascript-sites.ts
```typescript
/**
 * JavaScript-Heavy Sites Example
 *
 * This example demonstrates how to scrape websites that rely heavily on JavaScript
 * for rendering content, using JSDOM for enhanced processing.
 */

import { scrape } from "../src/index";

async function javascriptSitesExample() {
  console.log("🌐 JavaScript-heavy sites example");

  // URL of a site that requires JavaScript for rendering
  const url = "https://spa-example.com"; // Replace with an actual JavaScript-heavy site

  // First attempt without JavaScript handling
  console.log("\n🔍 Attempt 1: Without JavaScript handling");
  const resultWithoutJS = await scrape(url, {
    formats: ["markdown", "html"],
  });

  // Print the result
  if (resultWithoutJS.success && resultWithoutJS.data) {
    console.log("✅ Scrape successful without JS handling");

    // Show content preview
    if (resultWithoutJS.data.markdown) {
      const contentLength = resultWithoutJS.data.markdown.length;
      console.log(`Content length: ${contentLength} characters`);
      console.log(
        `Preview: ${resultWithoutJS.data.markdown.substring(0, 150)}...`,
      );
    } else {
      console.log(
        "❌ No markdown content received (JS content might be missing)",
      );
    }
  } else {
    console.error("❌ Scrape failed:", resultWithoutJS.error);
  }

  // Now try with JavaScript handling enabled
  console.log("\n🔍 Attempt 2: With JavaScript handling");
  const resultWithJS = await scrape(url, {
    formats: ["markdown", "html"],
    actions: [
      // Wait for content to load
      { type: "wait", milliseconds: 1000 },

      // Example: Click a button to show more content
      { type: "click", selector: ".load-more-button" },

      // Wait for new content to render
      { type: "wait", milliseconds: 500 },
    ],
  });

  // Print the result
  if (resultWithJS.success && resultWithJS.data) {
    console.log("✅ Scrape successful with JS handling");

    // Show content preview
    if (resultWithJS.data.markdown) {
      const contentLength = resultWithJS.data.markdown.length;
      console.log(`Content length: ${contentLength} characters`);
      console.log(
        `Preview: ${resultWithJS.data.markdown.substring(0, 150)}...`,
      );

      // Compare results
      const withoutJSLength = resultWithoutJS.data?.markdown?.length || 0;
      const withJSLength = resultWithJS.data.markdown.length;

      const percentDiff = withoutJSLength ?
        Math.round((withJSLength - withoutJSLength) / withoutJSLength * 100) :
        100;

      console.log("\n📊 Content comparison:");
      console.log(`Without JS: ${withoutJSLength} characters`);
      console.log(`With JS: ${withJSLength} characters`);
      console.log(`Difference: ${percentDiff}% more content with JS handling`);
    }
  } else {
    console.error("❌ Scrape failed:", resultWithJS.error);
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  javascriptSitesExample().catch((error) => console.error("Error:", error));
}
```

## File: examples/llm-extraction.ts
```typescript
/**
 * LLM-Based Extraction Example
 *
 * This example demonstrates how to extract structured data from websites
 * using local LLMs with Ollama integration.
 */

import { scrape } from "../src/index";

async function llmExtractionExample() {
  console.log("🤖 LLM-based extraction example");

  // Check if Ollama is running first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    console.log("Checking if Ollama server is running...");
    const ollamaResponse = await fetch("http://localhost:11434/api/version", {
      signal: controller.signal
    }).catch(error => {
      if (error.name === "AbortError") {
        throw new Error("Connection to Ollama timed out");
      }
      throw error;
    });

    clearTimeout(timeoutId);

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama server returned error: ${ollamaResponse.statusText}`);
    }

    const version = await ollamaResponse.json();
    console.log(`✅ Connected to Ollama version ${version.version}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`⚠️ Ollama server is not available: ${errorMessage}`);
    console.log("ℹ️ This example will still run but will show the fallback behavior.");
    console.log("ℹ️ To use Ollama, install from https://ollama.com/ and run 'ollama serve'");
    console.log("");
  }

  // Define a schema for the data you want to extract
  const schema = {
    title: {
      type: "string" as const,
      description: "The title of the page"
    },
    main_topics: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Main topics covered on the page"
    },
    has_code_examples: {
      type: "boolean" as const,
      description: "Whether the page contains code examples"
    },
    technology_stack: {
      type: "object" as const,
      properties: {
        languages: { type: "array" as const, items: { type: "string" as const } },
        frameworks: { type: "array" as const, items: { type: "string" as const } }
      },
      description: "Programming languages and frameworks mentioned"
    }
  };

  // Define a URL to scrape - we'll try a couple of different ones
  const urls = [
    "https://example.com", // Simple static site that works well
    "https://github.com/oven-sh/bun", // GitHub page for Bun
    "https://www.mozilla.org/en-US/about/" // Mozilla's about page (static site)
  ];

  for (const url of urls) {
    console.log(`\n🔍 Scraping and extracting structured data from ${url}...`);

    // Use scrape with extract format and extraction options
    const result = await scrape(url, {
      formats: ["markdown", "extract"],
      extractOptions: {
        schema,
        model: "gemma3:27b", // Use gemma3:27b model
        systemPrompt: `You are an expert in analyzing web content and extracting structured data.
        Analyze the provided content thoroughly and extract the requested information.
        Ensure the response follows the JSON schema exactly.
        If a field is requested but not found in the content, provide a reasonable default value based on the type.`,
        modelOptions: {
          temperature: 0.2, // Lower temperature for more deterministic results
          top_p: 0.9
        }
      }
    });

    if (result.success && result.data) {
      console.log(`✅ Scraping ${url} was successful`);

      // Display page metadata
      if (result.data.metadata) {
        console.log("\n📝 Page Metadata:");
        console.log(`Title: ${result.data.metadata.title || "N/A"}`);
        console.log(`URL: ${result.data.metadata.sourceURL}`);
      }

      // Display extracted structured data
      if (result.data.extract) {
        console.log("\n🔍 Extracted Structured Data:");

        // Check if extract contains error messages
        if (result.data.extract._error) {
          console.log(`⚠️ Extraction encountered an issue: ${result.data.extract._error}`);

          if (result.data.extract._hint) {
            console.log(`💡 Hint: ${result.data.extract._hint}`);
          }

          // Show a hint about installing Ollama if appropriate
          if (String(result.data.extract._error).includes("connection")) {
            console.log("📌 To use LLM extraction, install Ollama from https://ollama.com/");
            console.log("   and start it with 'ollama serve'");
          }

          if (String(result.data.extract._error).includes("Model")) {
            console.log("📌 Run: ollama pull gemma3:27b");
          }
        } else if (result.data.extract._warning) {
          console.log(`⚠️ Warning: ${result.data.extract._warning}`);
        } else {
          // Format the regular extraction results
          const formatValue = (value: unknown): string => {
            if (Array.isArray(value)) return `[${value.join(", ")}]`;
            if (typeof value === "object" && value !== null) {
              return JSON.stringify(value, null, 2);
            }
            return String(value);
          };

          for (const [key, value] of Object.entries(result.data.extract)) {
            if (key.startsWith("_")) continue; // Skip internal properties
            console.log(`${key}: ${formatValue(value)}`);
          }
        }
      } else {
        console.log("❌ No structured data was extracted");
      }

      // Print a small section of the markdown content
      if (result.data.markdown) {
        console.log("\n📄 Content Preview:");
        console.log(`${result.data.markdown.substring(0, 300)}...`);
        console.log(`Total content length: ${result.data.markdown.length} characters`);
      }
    } else {
      console.error(`❌ Scraping ${url} failed:`, result.error);

      // Try to identify the specific issue for better user feedback
      if (result.error?.includes("NotYetImplemented")) {
        console.log("ℹ️ This appears to be a JSDOM limitation. The scraper attempted to handle JavaScript content but encountered an unsupported feature.");
      } else if (result.error?.includes("fetch")) {
        console.log("ℹ️ There was a network issue fetching the content. Check your internet connection or try a different URL.");
      }
    }
  }

  console.log("\n🏁 Example completed!");
}

// Run the example if this file is executed directly
if (import.meta.main) {
  llmExtractionExample().catch((error) => console.error("Error:", error))
    .finally(() => {
      console.log("Extraction process complete, exiting...");
      // Force process to exit after a short delay to allow any pending operations to complete
      setTimeout(() => process.exit(0), 100);
    });
}
```

## File: examples/site-mapping.ts
```typescript
/**
 * Site Mapping Example
 *
 * This example demonstrates how to create a site map
 * by crawling a website and extracting its link structure.
 */

import { map } from "../src/index";

async function siteMapExample() {
	console.log("🗺️ Site mapping example");

	// Define the starting URL and mapping parameters
	const startUrl = "https://example.com";
	const result = await map(startUrl, {
		search: "", // No specific search term
		maxDepth: 3, // Go 3 links deep
		allowExternalDomains: false, // Only include internal links
	});

	if (result.success) {
		console.log(
			`✅ Site mapping completed: Found ${result.links.length} links`,
		);

		// Create a domain structure map
		const domainMap = new Map<string, string[]>();

		// Group links by path depth
		for (const link of result.links) {
			try {
				const url = new URL(link);
				const pathParts = url.pathname.split("/").filter(Boolean);
				const depth = pathParts.length;

				// Create a key based on the depth
				const key = depth === 0 ? "Root" : pathParts.slice(0, 1).join("/");

				if (!domainMap.has(key)) {
					domainMap.set(key, []);
				}

				domainMap.get(key)?.push(link);
			} catch (error) {
				// Skip invalid URLs
			}
		}

		// Display the site structure
		console.log("\n📊 Site Structure:");
		for (const [section, links] of domainMap.entries()) {
			console.log(`\n📁 ${section} (${links.length} links):`);

			// Display the first 5 links in each section
			for (const link of links.slice(0, 5)) {
				console.log(`   - ${link}`);
			}

			// Indicate if there are more links
			if (links.length > 5) {
				console.log(`   ... and ${links.length - 5} more links`);
			}
		}
	} else {
		console.error("❌ Site mapping failed:", result.error);
	}
}

// Run the example if this file is executed directly
if (import.meta.main) {
	siteMapExample().catch((error) => console.error("Error:", error));
}
```

## File: src/core/crawler.ts
```typescript
/**
 * Crawler Engine
 *
 * Handles crawling websites with parallel execution and resource management
 */

import pLimit from "p-limit";
import { extractLinks, filterLinks } from "../processors/link-extractor";
import type { CrawlOptions, CrawlResult, ScrapeResult } from "../types";
import { createCache } from "../utils/cache";
import { scrapeUrl } from "./scraper";

// Cache for seen URLs to avoid redundant checks
const seenUrlsCache = createCache<boolean>(60 * 60 * 1000); // 1 hour cache

// Cache for failed URLs to avoid retrying them repeatedly
const failedUrlsCache = createCache<string>(15 * 60 * 1000); // 15 minutes cache

interface CrawlState {
  visited: Set<string>;
  queue: string[];
  results: Array<NonNullable<ScrapeResult["data"]>>;
  errors: string[];
  depth: Map<string, number>;
  currentDepth: number;
  pagesProcessed: number;
  domainCounts: Map<string, number>; // Track domains for rate limiting
  lastProcessed: Map<string, number>; // Last time a domain was processed
}

/**
 * Extracts domain from URL for rate limiting
 */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url; // Fallback
  }
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
  const domainDelay = options.domainDelay ?? 200; // ms to wait between requests to same domain
  const domainConcurrency = options.domainConcurrency ?? 2; // max concurrent requests per domain

  if (process.env.DEBUG) {
    console.log(`🕸️ Starting crawl of ${startUrl}`);
    console.log(`🕸️ Max depth: ${maxDepth}, Max pages: ${maxPages}, Concurrency: ${concurrency}`);
  }

  // Clear any previously failed URLs for this crawl
  failedUrlsCache.clear();

  // Initialize crawl state
  const state: CrawlState = {
    visited: new Set<string>(),
    queue: [startUrl],
    results: [],
    errors: [],
    depth: new Map<string, number>(),
    currentDepth: 0,
    pagesProcessed: 0,
    domainCounts: new Map<string, number>(),
    lastProcessed: new Map<string, number>(),
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
  while (state.pagesProcessed < maxPages && state.queue.length > 0) {
    // Process a batch of URLs from the queue, grouping by domain
    const domainBatches = new Map<string, string[]>();

    // Group URLs by domain for controlled concurrency
    for (let i = 0; i < state.queue.length && domainBatches.size < concurrency; i++) {
      const url = state.queue[i];
      if (!url) continue;

      const domain = getDomain(url);

      // Skip if already visited or in failed cache
      if (state.visited.has(url) || failedUrlsCache.has(url)) {
        // Remove from queue
        state.queue.splice(i, 1);
        i--; // Adjust index since we removed an item
        continue;
      }

      // Skip if we're already processing too many URLs from this domain
      const domainCount = state.domainCounts.get(domain) || 0;
      if (domainCount >= domainConcurrency) {
        continue;
      }

      // Add to domain batch
      if (!domainBatches.has(domain)) {
        domainBatches.set(domain, []);
      }
      domainBatches.get(domain)?.push(url);

      // Remove from queue
      state.queue.splice(i, 1);
      i--; // Adjust index since we removed an item

      // Mark as visited
      state.visited.add(url);
    }

    // If no URLs to process but have active promises, wait for some to complete
    if (domainBatches.size === 0 && activePromises.length > 0) {
      if (process.env.DEBUG) {
        console.log(`⏳ Waiting for some promises to resolve (${activePromises.length} active, ${state.queue.length} in queue)`);
      }

      // Wait for the next promise to complete
      try {
        await Promise.race(activePromises);
      } catch (error) {
        // Ignore errors, they're handled in the processing function
      }

      // Clean up completed promises
      activePromises = activePromises.filter(p => !completedPromises.has(p));
      completedPromises.clear();

      continue;
    }

    // If there are no URLs to process and no active promises, we're done
    if (domainBatches.size === 0 && activePromises.length === 0) {
      break;
    }

    // Process each domain batch
    for (const [domain, urls] of domainBatches.entries()) {
      // Update domain count
      state.domainCounts.set(domain, (state.domainCounts.get(domain) || 0) + urls.length);

      // Process all URLs in the domain batch sequentially
      const domainPromise = limit(async () => {
        try {
          // Process URLs in sequence for the same domain
          for (const url of urls) {
            // Get depth of current URL
            const urlDepth = state.depth.get(url) ?? 0;

            // Check if we've exceeded max depth
            if (urlDepth > maxDepth) {
              // No need to process this URL
              if (process.env.DEBUG) {
                console.log(`🔄 Skipping URL at max depth: ${url} (depth: ${urlDepth})`);
              }
              continue;
            }

            // Rate limiting for domain
            const lastProcessedTime = state.lastProcessed.get(domain);
            if (lastProcessedTime) {
              const timeElapsed = Date.now() - lastProcessedTime;
              if (timeElapsed < domainDelay) {
                // Wait before processing next URL from same domain
                await new Promise(resolve => setTimeout(resolve, domainDelay - timeElapsed));
              }
            }

            // Process the URL
            if (process.env.DEBUG) {
              console.log(`🕸️ Processing URL: ${url} (depth: ${urlDepth})`);
            }

            try {
              await processUrl(url, urlDepth, state, options);
            } catch (urlError) {
              // Add to failed cache
              failedUrlsCache.set(url, urlError instanceof Error ? urlError.message : String(urlError));

              // Add to errors
              state.errors.push(`Error processing ${url}: ${urlError instanceof Error ? urlError.message : String(urlError)}`);

              if (process.env.DEBUG) {
                console.error(`❌ Error processing ${url}: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
              }
            }

            // Update last processed time
            state.lastProcessed.set(domain, Date.now());
          }
        } finally {
          // Decrement domain count when all URLs are processed
          state.domainCounts.set(domain, Math.max(0, (state.domainCounts.get(domain) || 0) - urls.length));
        }
      });

      // Set up completion tracking
      activePromises.push(domainPromise);
      domainPromise.then(() => {
        completedPromises.add(domainPromise);
      }).catch((error: unknown) => {
        completedPromises.add(domainPromise);
        console.error(`Error in domain batch for ${domain}:`, error);
      });
    }

    // Check if we have too many active promises
    if (activePromises.length > concurrency * 2) {
      if (process.env.DEBUG) {
        console.log(`⏳ Too many active promises (${activePromises.length}), waiting for some to complete`);
      }

      // Wait for any promise to complete
      try {
        await Promise.race(activePromises);
      } catch (error) {
        // Ignore errors, they're handled in the processing function
      }

      // Clean up completed promises
      activePromises = activePromises.filter(p => !completedPromises.has(p));
      completedPromises.clear();
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
    console.log(`Remaining queue: ${state.queue.length} items`);
    console.log(`Cache stats - Seen URLs: ${seenUrlsCache.stats().size}, Failed URLs: ${failedUrlsCache.stats().size}`);
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

    // Check if we already have an error for this URL
    if (failedUrlsCache.has(url)) {
      if (process.env.DEBUG) {
        console.log(`🚫 Skipping previously failed URL: ${url}`);
      }
      return;
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
          // Normalize URL to avoid duplicates
          try {
            const normalizedUrl = new URL(link).toString();

            // Skip if already visited or in the queue
            if (
              state.visited.has(normalizedUrl) ||
              state.queue.includes(normalizedUrl) ||
              failedUrlsCache.has(normalizedUrl) ||
              seenUrlsCache.has(normalizedUrl)
            ) {
              if (process.env.DEBUG) {
                console.log(`🔄 Already processed or queued, skipping: ${normalizedUrl}`);
              }
              continue;
            }

            // Add to queue and mark seen
            state.queue.push(normalizedUrl);
            state.depth.set(normalizedUrl, depth + 1);
            seenUrlsCache.set(normalizedUrl, true);
            addedLinks++;

            if (process.env.DEBUG && addedLinks <= 5) { // Limit log noise
              console.log(`➕ Added to queue: ${normalizedUrl} (depth ${depth + 1})`);
            }
          } catch (urlError) {
            // Skip invalid URLs
            if (process.env.DEBUG) {
              console.log(`⚠️ Invalid URL: ${link}`);
            }
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
      // Add to failed URLs cache
      failedUrlsCache.set(url, scrapeResult.error);

      state.errors.push(scrapeResult.error);
      if (process.env.DEBUG) {
        console.error(`❌ Error processing ${url}: ${scrapeResult.error}`);
      }
    }
  } catch (error) {
    // Add to failed URLs cache
    failedUrlsCache.set(url, error instanceof Error ? error.message : String(error));

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
```

## File: src/core/fetcher.ts
```typescript
/**
 * Smart Fetcher Module
 *
 * Handles fetching content with intelligent fallback to jsdom for JavaScript-heavy sites
 */

import * as cheerio from "cheerio";
import { JSDOM, VirtualConsole } from "jsdom";
import type { ContentType, FetchOptions } from "../types";

// Constants for known site types to avoid unnecessary content detection
const KNOWN_STATIC_DOMAINS = new Set([
	"example.com",
	"www.example.com",
	"en.wikipedia.org",
	"developer.mozilla.org",
	"www.iana.org",
	"www.mozilla.org",
	"static.mozilla.com"
]);

const KNOWN_JS_HEAVY_DOMAINS = new Set([
	"bun.sh",
	"angular.io",
	"reactjs.org",
	"vuejs.org",
	"svelte.dev"
]);

/**
 * Fast content type checker using domain knowledge
 * @returns true if we can skip the full content detection
 */
function quickContentTypeCheck(url: string): { skip: boolean; needsJavaScript?: boolean } {
	try {
		const hostname = new URL(url).hostname.toLowerCase();

		if (KNOWN_STATIC_DOMAINS.has(hostname)) {
			return { skip: true, needsJavaScript: false };
		}

		if (KNOWN_JS_HEAVY_DOMAINS.has(hostname)) {
			return { skip: true, needsJavaScript: true };
		}

		return { skip: false };
	} catch {
		return { skip: false };
	}
}

/**
 * Detects if a page is likely to require JavaScript for rendering its content
 */
export function detectContentType(html: string, url: string): ContentType {
	// First do a quick check based on domain knowledge
	const quickCheck = quickContentTypeCheck(url);
	if (quickCheck.skip && quickCheck.needsJavaScript !== undefined) {
		return {
			isStatic: !quickCheck.needsJavaScript,
			needsJavaScript: quickCheck.needsJavaScript,
			format: "text/html",
		};
	}

	// Use cheerio to analyze the DOM rather than string matching
	const $ = cheerio.load(html);

	// Get the page format
	const contentTypeMatch = $('meta[http-equiv="content-type"]').attr("content") ||
		$('meta[name="content-type"]').attr("content");
	const format = contentTypeMatch || "text/html";

	// Content analysis metrics
	const metrics = {
		// Check for actual content in the page
		textLength: $("body").text().trim().length,
		paragraphs: $("p").length,
		headings: $("h1, h2, h3, h4, h5, h6").length,
		contentElements: $("article, section, main, .content, #content").length,
		links: $("a[href]").length,
		images: $("img[src]").length,
		scripts: $("script").length,
		lazyLoadElements: $('[data-src], [data-lazy], [data-lazy-src], [loading="lazy"]').length,
	};

	// The main test: Does the page have enough content to be useful?
	const hasSubstantialContent =
		// Either good amount of text
		metrics.textLength > 500 ||
		// Or good structure with some content
		(
			metrics.paragraphs > 2 &&
			metrics.links > 0 &&
			(metrics.headings > 0 || metrics.contentElements > 0)
		);

	// Look for SPA indicators
	const isLikelySPA =
		// Very small amount of content
		metrics.textLength < 200 &&
		// Few structural elements
		metrics.paragraphs < 2 &&
		metrics.headings < 1 &&
		// Many scripts
		metrics.scripts > 3;

	// Look for lazy loading indicators - these often suggest JS is needed
	const hasLazyContent = metrics.lazyLoadElements > 0;

	// We need JavaScript if: 
	// 1. There's not enough content AND it seems like an SPA, or
	// 2. There are lazy loaded elements which need JS to display
	const needsJavaScript = (!hasSubstantialContent && isLikelySPA) || hasLazyContent;

	if (process.env.DEBUG) {
		console.log(`Content analysis for ${url}:`, {
			metrics,
			hasSubstantialContent,
			isLikelySPA,
			hasLazyContent,
			needsJavaScript
		});
	}

	return {
		isStatic: !needsJavaScript,
		needsJavaScript,
		format,
	};
}

/**
 * Fetches content with regular fetch API
 */
export async function simpleFetch(
	url: string,
	options: FetchOptions = {},
): Promise<{
	html: string;
	status: number;
	headers: Record<string, string>;
}> {
	const controller = new AbortController();
	const timeout = options.timeout ?? 30000;

	// Set up timeout
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			headers: options.headers ?? {
				"User-Agent": "Mozilla/5.0 (compatible; NimCrawler/1.0;)",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
			},
			signal: controller.signal,
			redirect: options.followRedirects === false ? "manual" : "follow",
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const html = await response.text();

		// Convert headers to record
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		return {
			html,
			status: response.status,
			headers,
		};
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error) {
			throw new Error(`Failed to fetch ${url}: ${error.message}`);
		}
		throw error;
	}
}

// Lazy-load JSDOM on first use
let jsdomClass: typeof JSDOM | null = null;
let virtualConsoleClass: typeof VirtualConsole | null = null;

function lazyLoadJsdom() {
	if (!jsdomClass || !virtualConsoleClass) {
		// JSDOM is already imported at the top level, but we'll ensure we have the classes
		jsdomClass = JSDOM;
		virtualConsoleClass = VirtualConsole;
	}
	return { JSDOM: jsdomClass, VirtualConsole: virtualConsoleClass };
}

/**
 * Fetches content using jsdom for JavaScript-heavy sites
 */
export async function jsDomFetch(
	url: string,
	options: FetchOptions = {},
): Promise<{
	html: string;
	status: number;
	headers: Record<string, string>;
}> {
	try {
		// Lazy load JSDOM classes when needed
		const { JSDOM, VirtualConsole } = lazyLoadJsdom();

		// Create a virtual console to capture errors but not spam the console
		const virtualConsole = new VirtualConsole();
		let jsdomErrors = 0;
		const MAX_JSDOM_ERRORS = 10; // Limit error logging

		virtualConsole.on("error", (error: Error) => {
			if (process.env.DEBUG && jsdomErrors < MAX_JSDOM_ERRORS) {
				console.error("JSDOM error:", error.message);
				jsdomErrors++;

				if (jsdomErrors === MAX_JSDOM_ERRORS) {
					console.error(`Suppressing further JSDOM errors for ${url}`);
				}
			}
		});

		// First do a basic fetch to get initial HTML to load in JSDOM
		// This prevents issues with JSDOM trying to fetch from scratch
		const { html: initialHtml } = await simpleFetch(url, options);

		// Create a new JSDOM instance with the initial HTML
		const jsdom = new JSDOM(initialHtml, {
			url,
			referrer: options.headers?.Referer,
			includeNodeLocations: false, // Disable for performance
			storageQuota: 10000000,
			pretendToBeVisual: true,
			resources: "usable",
			runScripts: "dangerously",
			virtualConsole,
		});

		// Wait longer for JavaScript to execute and populate metadata
		const timeout = options.timeout ?? 30000;
		// Cap at 8 seconds to avoid excessive waiting
		const waitTime = Math.min(timeout * 0.8, 8000);

		let result: string;

		try {
			result = await Promise.race([
				new Promise<string>((resolve) => {
					const onLoad = () => {
						// Give time for dynamic content to load but not too long
						setTimeout(() => {
							try {
								// Get the serialized HTML with dynamic content
								const content = jsdom.serialize();
								resolve(content);
							} catch (err) {
								// If serialization fails, fall back to the initial HTML
								resolve(initialHtml);
							}
						}, waitTime);
					};

					// Add the event listener for page load
					try {
						jsdom.window.addEventListener("load", onLoad);
					} catch (err) {
						// If addEventListener fails, resolve with initial HTML
						setTimeout(() => resolve(initialHtml), 100);
					}

					// If load event doesn't fire, resolve after a delay anyway
					setTimeout(() => {
						try {
							const content = jsdom.serialize();
							resolve(content);
						} catch (err) {
							// If serialization fails, fall back to the initial HTML
							resolve(initialHtml);
						}
					}, timeout - 1000); // Leave 1s buffer for cleanup
				}),

				// Timeout promise
				new Promise<string>((_, reject) => {
					setTimeout(() => {
						reject(new Error(`JSDOM fetch timed out after ${timeout}ms`));
					}, timeout);
				})
			]);
		} catch (error) {
			// If any step of the JSDOM process fails, fall back to the initial HTML
			result = initialHtml;
		}

		// Always make sure to clean up resources
		try {
			jsdom.window.close();
		} catch (error) {
			// Ignore errors during cleanup
		}

		return {
			html: result,
			status: 200, // Assuming success if we got this far
			headers: {}, // jsdom doesn't provide response headers
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch with jsdom ${url}: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Smart fetcher that automatically detects and uses the appropriate method
 */
export async function smartFetch(
	url: string,
	options: FetchOptions = {},
): Promise<{
	html: string;
	status: number;
	headers: Record<string, string>;
	usedJsdom: boolean;
}> {
	// Add a timeout if not provided
	const fetchOptions = {
		...options,
		timeout: options.timeout ?? 30000,
	};

	// Check if site is in our known categories to skip detection
	const quickCheck = quickContentTypeCheck(url);
	if (quickCheck.skip && quickCheck.needsJavaScript !== undefined) {
		if (!quickCheck.needsJavaScript) {
			// Known static site, use simple fetch
			const result = await simpleFetch(url, fetchOptions);
			return {
				...result,
				usedJsdom: false,
			};
		}

		// Known JS-heavy site, try JSDOM but with fallback
		if (process.env.DEBUG) {
			console.log(`Known JS-heavy site: ${url}, using JSDOM immediately`);
		}

		// Get static content first as fallback
		const staticResult = await simpleFetch(url, fetchOptions);

		try {
			const jsdomResult = await jsDomFetch(url, fetchOptions);

			// Verify JSDOM added significant content
			if (jsdomResult.html.length > staticResult.html.length * 1.1) {
				return {
					...jsdomResult,
					usedJsdom: true,
				};
			}
		} catch (jsdomError) {
			// JSDOM failed, just continue to return the static result
			if (process.env.DEBUG) {
				console.log(`JSDOM failed for known JS-heavy site ${url}: ${jsdomError instanceof Error ? jsdomError.message : String(jsdomError)}`);
			}
		}

		// Either JSDOM didn't add enough or it failed - return static result
		return {
			...staticResult,
			usedJsdom: false,
		};
	}

	// First try with simple fetch to get baseline content
	let simpleResult: {
		html: string;
		status: number;
		headers: Record<string, string>;
	};
	try {
		simpleResult = await simpleFetch(url, fetchOptions);
	} catch (simpleError) {
		console.error(`Simple fetch failed for ${url}: ${simpleError instanceof Error ? simpleError.message : String(simpleError)}`);

		// Try with JSDOM as fallback for simple fetch errors
		try {
			console.log(`Attempting to use JSDOM as fallback for ${url}...`);
			const jsdomResult = await jsDomFetch(url, fetchOptions);
			return {
				...jsdomResult,
				usedJsdom: true,
			};
		} catch (jsdomError) {
			// Both methods failed, throw the original error
			if (simpleError instanceof Error) {
				throw new Error(`Failed to fetch ${url}: ${simpleError.message}`);
			}
			throw simpleError;
		}
	}

	// We've got simpleResult, now check if we need JavaScript
	const contentType = detectContentType(simpleResult.html, url);

	// If it doesn't need JavaScript, return the simple result
	if (!contentType.needsJavaScript) {
		return {
			...simpleResult,
			usedJsdom: false,
		};
	}

	// JavaScript is needed, try JSDOM
	try {
		console.log(`Site ${url} appears to need JavaScript, attempting to use jsdom...`);

		try {
			const jsdomResult = await jsDomFetch(url, fetchOptions);

			// Verify the JSDOM result has more content than the simple fetch
			const simpleContentLength = simpleResult.html.length;
			const jsdomContentLength = jsdomResult.html.length;

			// Only use JSDOM result if it's significantly different
			if (jsdomContentLength > simpleContentLength * 1.1) { // 10% more content
				console.log(`JSDOM successfully enhanced content (${simpleContentLength} → ${jsdomContentLength} bytes)`);
				return {
					...jsdomResult,
					usedJsdom: true,
				};
			}

			console.log("JSDOM didn't significantly enhance content, using simple fetch result");
		} catch (jsdomError) {
			// Handle JSDOM errors gracefully
			const errorMessage = jsdomError instanceof Error ? jsdomError.message : String(jsdomError);

			if (errorMessage.includes("NotYetImplemented")) {
				console.log("JSDOM limitation encountered: NotYetImplemented - this is common for modern web frameworks");
			} else if (errorMessage.includes("null is not an object") ||
				errorMessage.includes("undefined is not an object")) {
				console.log("JSDOM JavaScript execution error - likely due to browser APIs not supported in JSDOM");
			} else {
				console.log(`JSDOM error: ${errorMessage}`);
			}
		}

		// Always fall back to simple fetch result if JSDOM fails or doesn't enhance content
		return {
			...simpleResult,
			usedJsdom: false,
		};
	} catch (error) {
		// If all attempts fail, return simple result as fallback
		console.error(`Error during smart fetch for ${url}: ${error instanceof Error ? error.message : String(error)}`);
		return {
			...simpleResult,
			usedJsdom: false,
		};
	}
}
```

## File: src/core/scraper.ts
```typescript
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
```

## File: src/processors/html-to-markdown.ts
```typescript
/**
 * HTML to Markdown converter
 */

import TurndownService from "turndown";

/**
 * Converts HTML to Markdown
 */
export function convertHtmlToMarkdown(html: string): string {
	const turndownService = new TurndownService({
		headingStyle: "atx",
		codeBlockStyle: "fenced",
		emDelimiter: "*",
	});

	// Additional rules to handle common elements better
	turndownService.addRule("images", {
		filter: "img",
		replacement: (content, node) => {
			const img = node as HTMLImageElement;
			const alt = img.alt || "";
			let src = img.getAttribute("src") || "";

			// Fix relative URLs
			if (src.startsWith("/") && !src.startsWith("//")) {
				const baseUrl = img.baseURI;
				if (baseUrl) {
					const urlObj = new URL(baseUrl);
					src = `${urlObj.protocol}//${urlObj.host}${src}`;
				}
			}

			return `![${alt}](${src})`;
		},
	});

	// Preserve tables
	turndownService.addRule("tables", {
		filter: ["table"],
		replacement: (content) => `\n\n${content}\n\n`,
	});

	// Clean up the HTML before conversion
	const cleanHtml = html
		// Remove script and style tags
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

	return turndownService.turndown(cleanHtml);
}
```

## File: src/processors/link-extractor.ts
```typescript
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
```

## File: src/processors/metadata-extractor.ts
```typescript
/**
 * Metadata Extractor
 *
 * Extracts metadata from HTML content
 */

import * as cheerio from "cheerio";
import type { PageMetadata } from "../types";

/**
 * Extract metadata from HTML content
 */
export function extractMetadata(
	html: string,
	sourceURL: string,
	statusCode: number,
): PageMetadata {
	const $ = cheerio.load(html);
	const metadata: PageMetadata = {
		sourceURL,
		statusCode,
	};

	// Extract title with fallbacks
	metadata.title =
		$("title").text().trim() ||
		$('meta[property="og:title"]').attr("content") ||
		$('meta[name="twitter:title"]').attr("content") ||
		$('h1').first().text().trim() ||
		undefined;

	// Extract description with fallbacks
	metadata.description =
		$('meta[name="description"]').attr("content") ||
		$('meta[property="og:description"]').attr("content") ||
		$('meta[name="twitter:description"]').attr("content") ||
		undefined;

	// Extract language with fallbacks
	metadata.language =
		$("html").attr("lang") ||
		$('meta[http-equiv="content-language"]').attr("content") ||
		$('meta[name="language"]').attr("content") ||
		undefined;

	// Extract keywords
	const keywordsContent = $('meta[name="keywords"]').attr("content");
	metadata.keywords = keywordsContent
		? keywordsContent
			.split(",")
			.map((k) => k.trim())
			.filter(Boolean)
		: undefined;

	// Extract robots
	metadata.robots = $('meta[name="robots"]').attr("content") || undefined;

	// Extract Open Graph metadata
	metadata.ogTitle =
		$('meta[property="og:title"]').attr("content") || undefined;
	metadata.ogDescription =
		$('meta[property="og:description"]').attr("content") || undefined;
	metadata.ogUrl = $('meta[property="og:url"]').attr("content") || undefined;
	metadata.ogImage =
		$('meta[property="og:image"]').attr("content") || undefined;
	metadata.ogSiteName =
		$('meta[property="og:site_name"]').attr("content") || undefined;

	// Extract Twitter card metadata
	metadata.twitterTitle =
		$('meta[name="twitter:title"]').attr("content") || undefined;
	metadata.twitterDescription =
		$('meta[name="twitter:description"]').attr("content") || undefined;
	metadata.twitterImage =
		$('meta[name="twitter:image"]').attr("content") || undefined;
	metadata.twitterCard =
		$('meta[name="twitter:card"]').attr("content") || undefined;

	// Extract Open Graph locale alternates
	const ogLocaleAlternate: string[] = [];
	$('meta[property="og:locale:alternate"]').each((_, el) => {
		const content = $(el).attr("content");
		if (content) {
			ogLocaleAlternate.push(content);
		}
	});

	if (ogLocaleAlternate.length > 0) {
		metadata.ogLocaleAlternate = ogLocaleAlternate;
	}

	// Make a best effort to extract a clean site name
	try {
		metadata.siteName =
			metadata.ogSiteName ||
			new URL(sourceURL).hostname.replace(/^www\./, '');
	} catch (e) {
		// Ignore URL parsing errors
	}

	return metadata;
}
```

## File: src/types/index.ts
```typescript
/**
 * Core types for the nimcrawl crawler
 */

import type { ExtractedData, ExtractionSchema, OllamaModelOptions } from "../utils/llm-processor";

export interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  proxy?: string;
  followRedirects?: boolean;
}

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  allowExternalDomains?: boolean;
  concurrency?: number;
  fetchOptions?: FetchOptions;
  formats?: OutputFormat[];
  beforeTransform?: (result: ScrapeResult) => void;
  afterTransform?: (result: ScrapeResult) => void;
  domainDelay?: number;
  domainConcurrency?: number;
}

export interface ScrapeOptions {
  formats?: OutputFormat[];
  extractMetadata?: boolean;
  extractLinks?: boolean;
  actions?: Action[];
  location?: LocationOptions;
  beforeTransform?: (result: ScrapeResult) => void;
  afterTransform?: (result: ScrapeResult) => void;
  extractOptions?: ExtractOptions;
}

export interface LocationOptions {
  country?: string;
  languages?: string[];
}

export type OutputFormat =
  | "markdown"
  | "html"
  | "rawHtml"
  | "screenshot"
  | "links"
  | "extract";

export interface Action {
  type: "wait" | "click" | "write" | "press" | "scrape" | "screenshot";
  selector?: string;
  text?: string;
  key?: string;
  milliseconds?: number;
}

/**
 * Options for extracting structured data using LLMs
 */
export interface ExtractOptions {
  schema?: ExtractionSchema;
  systemPrompt?: string;
  prompt?: string;
  model?: string;
  ollamaHost?: string;
  modelOptions?: OllamaModelOptions;
}

/**
 * Result of LLM-based extraction
 */
export interface ExtractResult {
  success: boolean;
  data?: ExtractedData;
  error?: string;
  rawResponse?: string;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  language?: string;
  keywords?: string[];
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  ogLocaleAlternate?: string[];
  ogSiteName?: string;
  // Twitter card metadata
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: string;
  // Site information
  siteName?: string;
  sourceURL: string;
  statusCode: number;
}

export interface ScrapeResult {
  success: boolean;
  error?: string;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    screenshot?: string;
    links?: string[];
    extract?: ExtractedData;
    metadata?: PageMetadata;
  };
}

export interface CrawlResult {
  success: boolean;
  error?: string;
  status: "completed" | "scraping" | "failed";
  total: number;
  completed: number;
  data: Array<ScrapeResult["data"]>;
}

export interface ContentType {
  isStatic: boolean;
  needsJavaScript: boolean;
  format: string;
}
```

## File: src/utils/cache.ts
```typescript
/**
 * Simple cache implementation for the crawler
 */

interface CacheItem<T> {
	value: T;
	expiry: number;
	metadata?: Record<string, unknown>;
}

/**
 * Creates a new cache with optional expiry time
 */
export function createCache<T>(defaultTtlMs: number = 60 * 60 * 1000) {
	const cache = new Map<string, CacheItem<T>>();
	let hits = 0;
	let misses = 0;
	let lastCleanup = Date.now();

	/**
	 * Sets a value in the cache with optional custom TTL
	 */
	function set(key: string, value: T, ttlMs: number = defaultTtlMs, metadata?: Record<string, unknown>): void {
		const expiry = Date.now() + ttlMs;
		cache.set(key, { value, expiry, metadata });
	}

	/**
	 * Gets a value from the cache if it exists and hasn't expired
	 */
	function get(key: string): T | undefined {
		const item = cache.get(key);

		if (!item) {
			misses++;
			return undefined;
		}

		if (Date.now() > item.expiry) {
			cache.delete(key);
			misses++;
			return undefined;
		}

		hits++;
		return item.value;
	}

	/**
	 * Checks if a key exists in the cache and hasn't expired
	 */
	function has(key: string): boolean {
		const item = cache.get(key);

		if (!item) {
			return false;
		}

		if (Date.now() > item.expiry) {
			cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Attempts to get a value from cache, or computes and caches it if missing
	 */
	async function getOrCompute(
		key: string,
		computeFn: () => Promise<T>,
		ttlMs: number = defaultTtlMs
	): Promise<T> {
		const cachedValue = get(key);
		if (cachedValue !== undefined) {
			return cachedValue;
		}

		const computedValue = await computeFn();
		set(key, computedValue, ttlMs);
		return computedValue;
	}

	/**
	 * Removes an item from the cache
	 */
	function remove(key: string): void {
		cache.delete(key);
	}

	/**
	 * Clears all expired items from the cache
	 */
	function clearExpired(): void {
		const now = Date.now();

		// Only clean if it's been at least 30 seconds since last cleanup
		if (now - lastCleanup < 30000) {
			return;
		}

		lastCleanup = now;
		let expiredCount = 0;

		for (const [key, item] of cache.entries()) {
			if (now > item.expiry) {
				cache.delete(key);
				expiredCount++;
			}
		}

		if (process.env.DEBUG && expiredCount > 0) {
			console.log(`Cache cleanup: removed ${expiredCount} expired items`);
		}
	}

	/**
	 * Clears all items from the cache
	 */
	function clear(): void {
		cache.clear();
		hits = 0;
		misses = 0;
	}

	/**
	 * Gets the size of the cache
	 */
	function size(): number {
		return cache.size;
	}

	/**
	 * Gets cache statistics
	 */
	function stats(): { size: number; hits: number; misses: number; hitRate: number } {
		const total = hits + misses;
		const hitRate = total > 0 ? hits / total : 0;
		return { size: cache.size, hits, misses, hitRate };
	}

	// Automatically clear expired items periodically, but less frequently (every 5 minutes)
	const cleanupInterval = 5 * 60 * 1000; // 5 minutes
	setInterval(clearExpired, cleanupInterval);

	return {
		set,
		get,
		has,
		getOrCompute,
		remove,
		clearExpired,
		clear,
		size,
		stats,
	};
}
```

## File: src/utils/llm-processor.ts
```typescript
/**
 * LLM Processor Utility
 * 
 * Provides integration with Ollama for local LLM processing
 * Used for structured data extraction, summarization, and content analysis
 */

import { Ollama } from "ollama";
import type { ExtractOptions, ExtractResult } from "../types";
import { createCache } from "./cache";

// Default Ollama server URL
const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";

// Default model to use
const DEFAULT_MODEL = "gemma3:27b";

// Cache for model availability checks - 10 minutes TTL
const MODEL_VALIDATION_CACHE = createCache<boolean>(10 * 60 * 1000);

// Cache for Ollama server health checks - 1 minute TTL
const SERVER_HEALTH_CACHE = createCache<boolean>(60 * 1000);

/**
 * Estimates tokens based on rough character count
 * Different models have different tokenization, but this is a reasonable approximation
 */
function estimateTokens(text: string): number {
  // An average of 4 characters per token is a reasonable approximation
  // for many languages and tokenization schemes
  return Math.ceil(text.length / 4);
}

/**
 * Adaptively truncates content based on model context limits
 * @param content The content to truncate
 * @param model The model name (used to determine appropriate limits)
 * @returns Truncated content
 */
function adaptiveTruncate(content: string, model?: string): string {
  // Determine context size based on model
  let contextSize = 4096; // Default context size

  if (model) {
    // Different models have different context windows
    const modelName = model.toLowerCase();
    if (modelName.includes("llama3")) contextSize = 8192;
    else if (modelName.includes("llama2")) contextSize = 4096;
    else if (modelName.includes("gemma3")) contextSize = 8192;
    else if (modelName.includes("gemma")) contextSize = 8192;
    else if (modelName.includes("mistral")) contextSize = 8192;
    else if (modelName.includes("mixtral")) contextSize = 32768;
    else if (modelName.includes("phi3")) contextSize = 2048;
  }

  // Reserve tokens for prompt overhead and response
  const promptOverheadTokens = 500;
  const maxResponseTokens = 1000;
  const availableTokens = contextSize - promptOverheadTokens - maxResponseTokens;

  // Estimate tokens in content (4 chars per token is a rough estimate)
  const estimatedTokens = Math.ceil(content.length / 4);

  // If content fits, return it unchanged
  if (estimatedTokens <= availableTokens) {
    return content;
  }

  // Otherwise, truncate to fit
  const ratio = availableTokens / estimatedTokens;
  const charsToKeep = Math.floor(content.length * ratio);

  // If very long, keep introduction and conclusion
  if (content.length > 10000) {
    const introLength = Math.floor(charsToKeep * 0.7);
    const conclusionLength = charsToKeep - introLength;

    return `${content.substring(0, introLength)}

[...content truncated for model context size...]

${content.substring(content.length - conclusionLength)}`;
  }

  // Otherwise just truncate from the end
  return `${content.substring(0, charsToKeep)}

[...remainder truncated for model context size...]`;
}

/**
 * Model options for Ollama API
 */
export interface OllamaModelOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_ctx?: number;
  num_predict?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  tfs_z?: number;
  mirostat?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
}

/**
 * Schema definition for LLM extraction
 */
export interface SchemaProperty {
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
  description?: string;
  items?: SchemaProperty; // For array types
  properties?: Record<string, SchemaProperty>; // For object types
  required?: string[]; // For object types
  enum?: string[] | number[] | boolean[]; // For enum constraints
  minimum?: number; // For number constraints
  maximum?: number; // For number constraints
  minLength?: number; // For string constraints
  maxLength?: number; // For string constraints
  pattern?: string; // For string pattern constraints
  format?: string; // For string format constraints
}

/**
 * Strongly typed schema for LLM extraction
 */
export interface ExtractionSchema {
  [key: string]: SchemaProperty;
}

/**
 * Options for content summarization
 */
export interface SummarizeOptions {
  model?: string;
  maxLength?: number;
  ollamaHost?: string;
  modelOptions?: OllamaModelOptions;
}

/**
 * Result of summarization
 */
export interface SummarizeResult {
  success: boolean;
  summary?: string;
  error?: string;
}

/**
 * Default template for extracting structured data
 */
const DEFAULT_EXTRACTION_TEMPLATE = `
You are an AI assistant specialized in extracting structured data from web content.
Extract the requested information according to the provided schema.
Only include information that is explicitly mentioned in the content.
Response MUST be valid JSON matching the schema exactly.
Be thorough in your analysis and extract all relevant information.
If you cannot find information for a field, use an appropriate default value based on the field type.
`;

/**
 * Extracted data type - strongly typed data structure for extracted content
 */
export type ExtractedData = Record<string, string | number | boolean | null | string[] | number[] | boolean[] | Record<string, string | number | boolean | null | string[] | number[] | boolean[]>>;

/**
 * Creates an Ollama client
 */
function createOllamaClient(host?: string): Ollama {
  return new Ollama({ host: host || DEFAULT_OLLAMA_HOST });
}

/**
 * Checks if Ollama server is running with caching to avoid repeated checks
 */
async function checkServerHealth(ollamaHost: string): Promise<boolean> {
  const cacheKey = `server:${ollamaHost}`;

  // Check cache first
  const cachedHealth = SERVER_HEALTH_CACHE.get(cacheKey);
  if (cachedHealth !== undefined) {
    return cachedHealth;
  }

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${ollamaHost}/api/version`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const isHealthy = response.ok;
    SERVER_HEALTH_CACHE.set(cacheKey, isHealthy);
    return isHealthy;
  } catch (error) {
    SERVER_HEALTH_CACHE.set(cacheKey, false);
    return false;
  }
}

/**
 * Validates whether the model exists in Ollama with caching to avoid repeated checks
 */
async function validateModel(ollama: Ollama, model: string, ollamaHost: string): Promise<boolean> {
  const cacheKey = `model:${ollamaHost}:${model}`;

  // Check cache first
  const cachedValidation = MODEL_VALIDATION_CACHE.get(cacheKey);
  if (cachedValidation !== undefined) {
    return cachedValidation;
  }

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${ollamaHost}/api/tags`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      MODEL_VALIDATION_CACHE.set(cacheKey, false);
      console.error(`Failed to get model list: ${response.statusText}`);
      return false;
    }

    const data = await response.json() as { models: Array<{ name: string }> };
    const modelExists = data.models.some(m => m.name === model);

    if (!modelExists) {
      console.error(`Model "${model}" not found. Available models: ${data.models.map(m => m.name).join(", ")}`);
      console.error(`Try running: ollama pull ${model}`);
    }

    MODEL_VALIDATION_CACHE.set(cacheKey, modelExists);
    return modelExists;
  } catch (error) {
    MODEL_VALIDATION_CACHE.set(cacheKey, false);
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`Timeout while checking for model: ${model}`);
    } else {
      console.error(`Error checking for model: ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
  }
}

/**
 * Extracts structured data from content using Ollama
 */
export async function extractStructuredData(
  content: string,
  options: ExtractOptions = {}
): Promise<ExtractResult> {
  try {
    // Validate we have enough content to extract from
    if (!content || content.trim().length < 200) {
      return {
        success: false,
        error: "Content is too short for meaningful extraction",
        data: { _warning: "Content too short for extraction" }
      };
    }

    // Create a reasonable fallback schema if none provided
    const schema = options.schema || {
      title: { type: "string", description: "The title of the page" },
      summary: { type: "string", description: "A brief summary of the content" },
      topics: { type: "array", items: { type: "string" }, description: "Main topics covered" }
    };

    // Try to connect to Ollama
    try {
      const ollamaHost = options.ollamaHost || DEFAULT_OLLAMA_HOST;
      const model = options.model || DEFAULT_MODEL;

      // First check if Ollama server is running
      console.log(`Checking Ollama server at ${ollamaHost}...`);
      const serverIsHealthy = await checkServerHealth(ollamaHost);

      if (!serverIsHealthy) {
        return {
          success: false,
          error: `Could not connect to Ollama server at ${ollamaHost}. Make sure Ollama is running.`,
          data: { _error: "Ollama connection failed", _hint: "Run Ollama with 'ollama serve'" }
        };
      }

      // Then initialize Ollama client
      const ollama = createOllamaClient(ollamaHost);

      // Check if model exists
      const modelExists = await validateModel(ollama, model, ollamaHost);
      if (!modelExists) {
        return {
          success: false,
          error: `Model "${model}" not found in Ollama. Try running: ollama pull ${model}`,
          data: { _error: `Model "${model}" not found` }
        };
      }

      console.log(`Using model: ${model} for extraction`);

      // Create schema-based prompt
      const systemPrompt = options.systemPrompt || DEFAULT_EXTRACTION_TEMPLATE;

      // Adaptively truncate content based on model's context window
      const truncatedContent = adaptiveTruncate(content, model);

      // Format user prompt with schema and truncated content
      const userPrompt = options.prompt ||
        `Extract the following data from the content according to this schema:
        ${JSON.stringify(schema, null, 2)}
        
        Content:
        ${truncatedContent}
        
        Response should be ONLY valid JSON matching the schema exactly.
        Each field must be present and populated with the values from the content.
        Be thorough in your extraction and ensure to output a valid JSON object.`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      console.log("Sending extraction request to Ollama...");
      console.log(`Schema: ${JSON.stringify(schema, null, 2)}`);

      try {
        // Get response from Ollama
        const response = await ollama.chat({
          model,
          messages,
          format: "json",
          // Pass additional model parameters
          options: options.modelOptions
        });

        console.log("Received response from Ollama");
        console.log(`Raw response (first 200 chars): ${response.message.content.substring(0, 200)}`);

        // Parse the response
        try {
          const responseContent = response.message.content.trim();

          // Try to extract JSON directly first
          if (responseContent.startsWith("{") && responseContent.endsWith("}")) {
            const extractedData = JSON.parse(responseContent) as ExtractedData;

            if (Object.keys(extractedData).length === 0) {
              console.warn("Warning: Extracted data is an empty object");
            }

            return {
              success: true,
              data: extractedData
            };
          }

          // If not a direct JSON, try to find JSON block in the response
          const jsonStart = responseContent.indexOf("{");
          const jsonEnd = responseContent.lastIndexOf("}") + 1;

          if (jsonStart === -1 || jsonEnd === 0) {
            console.error("No valid JSON found in response:");
            console.error(responseContent);
            return {
              success: false,
              error: "No valid JSON found in response",
              rawResponse: responseContent
            };
          }

          const jsonContent = responseContent.slice(jsonStart, jsonEnd);
          console.log(`Extracted JSON from response (${jsonContent.length} chars)`);

          try {
            const extractedData = JSON.parse(jsonContent) as ExtractedData;

            if (Object.keys(extractedData).length === 0) {
              console.warn("Warning: Extracted data is an empty object");
            }

            return {
              success: true,
              data: extractedData
            };
          } catch (jsonError) {
            console.error("Failed to parse JSON from response:", jsonError);
            return {
              success: false,
              error: `Failed to parse JSON from response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
              rawResponse: responseContent
            };
          }
        } catch (parseError) {
          console.error("Failed to parse LLM response:", parseError);
          console.error("Raw response:", response.message.content);

          return {
            success: false,
            error: `Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            rawResponse: response.message.content
          };
        }
      } catch (ollamaError) {
        console.error("Ollama API error:", ollamaError);

        // Check for specific error types
        const errorMessage = ollamaError instanceof Error ? ollamaError.message : String(ollamaError);

        if (errorMessage.includes("Failed to fetch") || errorMessage.includes("ECONNREFUSED")) {
          // Update server health cache to avoid retrying
          SERVER_HEALTH_CACHE.set(`server:${ollamaHost}`, false);

          return {
            success: false,
            error: `Failed to connect to Ollama. Make sure the server is running at ${ollamaHost}`,
            data: { _error: "Ollama connection error", _hint: "Check if Ollama is running" }
          };
        }

        if (errorMessage.includes("not found")) {
          // Update model validation cache
          MODEL_VALIDATION_CACHE.set(`model:${ollamaHost}:${model}`, false);

          return {
            success: false,
            error: `Model "${model}" not found. Try running: ollama pull ${model}`,
            data: { _error: "Model not found", _hint: `Run: ollama pull ${model}` }
          };
        }

        return {
          success: false,
          error: `LLM extraction failed: ${errorMessage}`,
          data: { _error: "Ollama API error" }
        };
      }
    } catch (error) {
      console.error("LLM extraction error:", error);
      return {
        success: false,
        error: `LLM extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        data: { _error: "Extraction error" }
      };
    }
  } catch (error) {
    console.error("Fatal error during extraction:", error);
    return {
      success: false,
      error: `Fatal error during extraction: ${error instanceof Error ? error.message : String(error)}`,
      data: { _fatal: "Extraction system error" }
    };
  }
}

/**
 * Summarizes content using Ollama
 */
export async function summarizeContent(
  content: string,
  options: SummarizeOptions = {}
): Promise<SummarizeResult> {
  try {
    const ollamaHost = options.ollamaHost || DEFAULT_OLLAMA_HOST;
    const model = options.model || DEFAULT_MODEL;

    // Check server health first
    const serverIsHealthy = await checkServerHealth(ollamaHost);
    if (!serverIsHealthy) {
      return {
        success: false,
        error: `Could not connect to Ollama server at ${ollamaHost}. Make sure Ollama is running.`
      };
    }

    // Initialize client
    const ollama = createOllamaClient(ollamaHost);

    // Validate model exists
    const modelExists = await validateModel(ollama, model, ollamaHost);
    if (!modelExists) {
      return {
        success: false,
        error: `Model "${model}" not found in Ollama. Try running: ollama pull ${model}`
      };
    }

    console.log(`Using model: ${model} for summarization`);
    const maxLength = options.maxLength || 200;

    const systemPrompt =
      `You are an AI assistant specialized in summarizing web content.
      Create clear, concise summaries that capture the main points.`;

    // Use adaptive truncation for content
    const truncatedContent = adaptiveTruncate(content, model);

    const userPrompt =
      `Summarize the following content in ${maxLength} words or less:
      
      ${truncatedContent}`;

    console.log("Sending summarization request to Ollama...");

    // Set up a timeout for the Ollama request
    const response = await ollama.chat({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      options: options.modelOptions
    });

    console.log("Received summarization response from Ollama");

    return {
      success: true,
      summary: response.message.content.trim()
    };
  } catch (error) {
    console.error("Summarization error:", error);

    return {
      success: false,
      error: `Summarization failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
```

## File: src/utils/markdown-merger.ts
```typescript
export async function mergeMarkdownFiles(files: string[]) {
  const content = await Promise.all(files.map(file => Bun.file(file).text()));
  return content.join("\n\n");
}
```

## File: src/utils/rate-limiter.ts
```typescript
/**
 * Rate limiter implementation
 *
 * Provides domain-specific rate limiting with configurable rules
 */

interface RateLimitRule {
	tokensPerInterval: number;
	interval: number; // in milliseconds
	tokensLeft: number;
	lastRefill: number;
}

interface RateLimiterOptions {
	/**
	 * Default rule for any domain not explicitly configured
	 */
	defaultRule?: {
		tokensPerInterval: number;
		interval: number; // in milliseconds
	};

	/**
	 * Domain-specific rules
	 */
	domainRules?: Record<
		string,
		{
			tokensPerInterval: number;
			interval: number; // in milliseconds
		}
	>;
}

/**
 * Creates a rate limiter with token bucket algorithm
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
	const defaultRule = options.defaultRule ?? {
		tokensPerInterval: 5,
		interval: 1000, // 5 requests per second
	};

	const rules = new Map<string, RateLimitRule>();

	// Initialize domain rules from options
	if (options.domainRules) {
		for (const [domain, rule] of Object.entries(options.domainRules)) {
			rules.set(domain, {
				...rule,
				tokensLeft: rule.tokensPerInterval,
				lastRefill: Date.now(),
			});
		}
	}

	/**
	 * Gets the hostname from a URL
	 */
	function getHostname(url: string): string {
		try {
			return new URL(url).hostname;
		} catch (error) {
			return url;
		}
	}

	/**
	 * Gets or creates a rule for a domain
	 */
	function getRuleForDomain(domain: string): RateLimitRule {
		let rule = rules.get(domain);

		if (!rule) {
			rule = {
				...defaultRule,
				tokensLeft: defaultRule.tokensPerInterval,
				lastRefill: Date.now(),
			};
			rules.set(domain, rule);
		}

		return rule;
	}

	/**
	 * Refills tokens for a rule based on elapsed time
	 */
	function refillTokens(rule: RateLimitRule): void {
		const now = Date.now();
		const elapsed = now - rule.lastRefill;

		if (elapsed >= rule.interval) {
			// Calculate how many full intervals have passed
			const intervals = Math.floor(elapsed / rule.interval);

			// Add tokens for each interval
			rule.tokensLeft = Math.min(
				rule.tokensPerInterval,
				rule.tokensLeft + intervals * rule.tokensPerInterval,
			);

			// Update last refill time, accounting for unused partial intervals
			rule.lastRefill = now - (elapsed % rule.interval);
		}
	}

	/**
	 * Acquires a token for a URL, or waits until one is available
	 */
	async function acquire(url: string): Promise<void> {
		const domain = getHostname(url);
		const rule = getRuleForDomain(domain);

		// Try to refill tokens before checking
		refillTokens(rule);

		// If we have tokens available, consume one and return
		if (rule.tokensLeft > 0) {
			rule.tokensLeft--;
			return;
		}

		// Otherwise, calculate how long to wait
		const timeToWait = rule.interval - (Date.now() - rule.lastRefill);

		// Wait for the next token to become available
		await new Promise((resolve) => setTimeout(resolve, timeToWait));

		// Retry after waiting
		return acquire(url);
	}

	/**
	 * Creates a wrapper for a function that respects rate limits
	 */
	function wrap<Args extends unknown[], Return>(
		fn: (...args: Args) => Promise<Return>,
		urlExtractor: (args: Args) => string,
	): (...args: Args) => Promise<Return> {
		return async (...args: Args): Promise<Return> => {
			const url = urlExtractor(args);
			await acquire(url);
			return fn(...args);
		};
	}

	/**
	 * Updates a rule for a specific domain
	 */
	function updateRule(
		domain: string,
		rule: {
			tokensPerInterval: number;
			interval: number;
		},
	): void {
		const existingRule = rules.get(domain);

		rules.set(domain, {
			...rule,
			tokensLeft: existingRule?.tokensLeft ?? rule.tokensPerInterval,
			lastRefill: existingRule?.lastRefill ?? Date.now(),
		});
	}

	/**
	 * Gets the current state of all rules
	 */
	function getRules(): Record<
		string,
		{
			tokensPerInterval: number;
			interval: number;
			tokensLeft: number;
			lastRefill: number;
		}
	> {
		const result: Record<string, RateLimitRule> = {};

		for (const [domain, rule] of rules.entries()) {
			result[domain] = { ...rule };
		}

		return result;
	}

	return {
		acquire,
		wrap,
		updateRule,
		getRules,
	};
}
```

## File: src/utils/test-server.ts
```typescript
/**
 * Simple test server for unit tests
 */

/**
 * Starts a simple HTTP server for testing
 */
export function startServer() {
	return Bun.serve({
		port: 0, // Use an available port
		hostname: "localhost",
		fetch(req) {
			const url = new URL(req.url);

			// Serve different test cases based on the path
			switch (url.pathname) {
				case "/static":
					return new Response(
						`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Test Page</title>
                <meta name="description" content="A test page for NimCrawl">
              </head>
              <body>
                <h1>Test Page</h1>
                <p>This is a test page for NimCrawl.</p>
              </body>
            </html>
          `,
						{
							headers: { "Content-Type": "text/html" },
						},
					);

				case "/links":
					return new Response(
						`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Links Test Page</title>
              </head>
              <body>
                <h1>Links Test Page</h1>
                <ul>
                  <li><a href="/static">Static Page</a></li>
                  <li><a href="https://example.com">External Link</a></li>
                  <li><a href="/dynamic">Dynamic Page</a></li>
                </ul>
              </body>
            </html>
          `,
						{
							headers: { "Content-Type": "text/html" },
						},
					);

				case "/dynamic":
					return new Response(
						`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Dynamic Test Page</title>
                <script>
                  document.addEventListener('DOMContentLoaded', () => {
                    document.getElementById('content').innerHTML = '<p>Dynamically loaded content</p>';
                  });
                </script>
              </head>
              <body>
                <h1>Dynamic Test Page</h1>
                <div id="content">Loading...</div>
              </body>
            </html>
          `,
						{
							headers: { "Content-Type": "text/html" },
						},
					);

				default:
					return new Response("Not Found", { status: 404 });
			}
		},
	});
}
```

## File: src/index.ts
```typescript
/**
 * NimCrawl - A highly efficient web scraper and crawler
 */

import { crawlUrl, mapUrl } from "./core/crawler";
import { batchScrapeUrls, scrapeUrl } from "./core/scraper";

import type {
  CrawlOptions,
  CrawlResult,
  ExtractOptions,
  ExtractResult,
  FetchOptions,
  ScrapeOptions,
  ScrapeResult,
} from "./types";
import { createCache } from "./utils/cache";
import { extractStructuredData, summarizeContent } from "./utils/llm-processor";
import type { SummarizeOptions, SummarizeResult } from "./utils/llm-processor";
import { createRateLimiter } from "./utils/rate-limiter";

// Default options
const DEFAULT_SCRAPE_OPTIONS: ScrapeOptions = {
  formats: ["markdown"],
  extractMetadata: true,
  extractLinks: true,
};

const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxDepth: 3,
  maxPages: 100,
  concurrency: 5,
  allowExternalDomains: false,
  domainDelay: 200,       // 200ms between requests to same domain
  domainConcurrency: 2,   // Max 2 concurrent requests per domain
};

// Create cache and rate limiter instances
const scrapeCache = createCache<ScrapeResult>(15 * 60 * 1000); // 15 minutes cache
const rateLimiter = createRateLimiter();

// Performance tracking
const perfMetrics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalTime: 0,
};

/**
 * Scrapes a URL with caching and rate limiting
 */
export async function scrape(
  url: string,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const startTime = performance.now();
  perfMetrics.requests++;

  // Generate cache key based on URL and options
  const cacheKey = `scrape:${url}:${JSON.stringify(options)}`;

  // Check cache first
  const cachedResult = scrapeCache.get(cacheKey);
  if (cachedResult) {
    perfMetrics.cacheHits++;
    perfMetrics.totalTime += performance.now() - startTime;

    // Log cache hit if in debug mode
    if (process.env.DEBUG) {
      console.log(`Cache hit for ${url}`);
    }

    return cachedResult;
  }

  perfMetrics.cacheMisses++;

  // Apply rate limiting
  await rateLimiter.acquire(url);

  // Merge with default options
  const mergedOptions: ScrapeOptions = {
    ...DEFAULT_SCRAPE_OPTIONS,
    ...options,
  };

  try {
    // Perform the scrape
    const result = await scrapeUrl(url, mergedOptions);

    // Cache the result only if successful
    if (result.success && result.data && Object.keys(result.data).length > 0) {
      scrapeCache.set(cacheKey, result);
    }

    // Ensure result has a data object even in failure cases
    if (!result.data) {
      result.data = {};
    }

    perfMetrics.totalTime += performance.now() - startTime;
    return result;
  } catch (error) {
    // Handle any unexpected errors
    const errorResult: ScrapeResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during scrape',
      data: {}, // Always ensure data exists
    };

    perfMetrics.totalTime += performance.now() - startTime;
    return errorResult;
  }
}

/**
 * Batch scrapes multiple URLs with caching and rate limiting
 */
export async function batchScrape(
  urls: string[],
  options: ScrapeOptions = {},
): Promise<{
  success: boolean;
  error?: string;
  data: Array<NonNullable<ScrapeResult["data"]>>;
}> {
  const startTime = performance.now();

  // Merge with default options
  const mergedOptions: ScrapeOptions = {
    ...DEFAULT_SCRAPE_OPTIONS,
    ...options,
  };

  try {
    // Use batchScrapeUrls to process URLs
    const result = await batchScrapeUrls(urls, mergedOptions);

    if (process.env.DEBUG) {
      const endTime = performance.now();
      console.log(`Batch scrape completed in ${Math.round(endTime - startTime)}ms`);
      console.log(`Processed ${urls.length} URLs, ${result.data.length} successful`);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown batch scraping error',
      data: [],
    };
  }
}

/**
 * Crawls a website starting from a URL
 */
export async function crawl(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const startTime = performance.now();

  // Merge with default options
  const mergedOptions: CrawlOptions = {
    ...DEFAULT_CRAWL_OPTIONS,
    ...options,
  };

  const result = await crawlUrl(url, mergedOptions);

  if (process.env.DEBUG) {
    const endTime = performance.now();
    console.log(`Crawl completed in ${Math.round(endTime - startTime)}ms`);
    console.log(`Performance: ${perfMetrics.requests} total requests, ${perfMetrics.cacheHits} cache hits (${Math.round(perfMetrics.cacheHits / perfMetrics.requests * 100)}% cache hit rate)`);
    console.log(`Average request time: ${Math.round(perfMetrics.totalTime / perfMetrics.requests)}ms`);
  }

  return result;
}

/**
 * Maps a website and returns all URLs
 */
export async function map(
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
  return await mapUrl(url, options);
}

/**
 * Extracts structured data from content using LLMs
 */
export async function extract(
  content: string,
  options: ExtractOptions = {},
): Promise<ExtractResult> {
  return await extractStructuredData(content, options);
}

/**
 * Summarizes content using LLMs
 */
export async function summarize(
  content: string,
  options: SummarizeOptions = {},
): Promise<SummarizeResult> {
  return await summarizeContent(content, options);
}

/**
 * Gets performance metrics
 */
export function getPerformanceMetrics() {
  return {
    ...perfMetrics,
    cacheHitRate: perfMetrics.requests > 0 ? perfMetrics.cacheHits / perfMetrics.requests : 0,
    averageRequestTime: perfMetrics.requests > 0 ? perfMetrics.totalTime / perfMetrics.requests : 0
  };
}

export type {
  ScrapeOptions,
  ScrapeResult,
  CrawlOptions,
  CrawlResult,
  FetchOptions,
  ExtractOptions,
  ExtractResult,
  SummarizeOptions,
  SummarizeResult,
};
```

## File: .gitignore
```
# dependencies (bun install)
node_modules

# output
out
dist
*.tgz

# code coverage
coverage
*.lcov

# logs
logs
_.log
report.[0-9]_.[0-9]_.[0-9]_.[0-9]_.json

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# caches
.eslintcache
.cache
*.tsbuildinfo

# IntelliJ based IDEs
.idea

# Finder (MacOS) folder config
.DS_Store

output
docs
```

## File: biome.json
```json
{
	"$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
	"vcs": {
		"enabled": false,
		"clientKind": "git",
		"useIgnoreFile": false
	},
	"files": {
		"ignoreUnknown": false,
		"ignore": []
	},
	"formatter": {
		"enabled": true,
		"indentStyle": "tab"
	},
	"organizeImports": {
		"enabled": true
	},
	"linter": {
		"enabled": true,
		"rules": {
			"recommended": true,
			"suspicious": {
				"useAwait": "error"
			}
		}
	},
	"javascript": {
		"formatter": {
			"quoteStyle": "double"
		}
	}
}
```

## File: bun.lock
```
{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "name": "@aelysia.labs/nimcrawl",
      "dependencies": {
        "cheerio": "^1.0.0-rc.12",
        "jsdom": "^24.0.0",
        "marked": "^12.0.0",
        "ollama": "^0.5.14",
        "p-limit": "^5.0.0",
        "turndown": "^7.1.2",
      },
      "devDependencies": {
        "@biomejs/biome": "^1.9.4",
        "@types/bun": "latest",
        "@types/jsdom": "^21.1.7",
        "@types/turndown": "^5.0.5",
      },
      "peerDependencies": {
        "typescript": "^5",
      },
    },
  },
  "packages": {
    "@asamuzakjp/css-color": ["@asamuzakjp/css-color@3.1.1", "", { "dependencies": { "@csstools/css-calc": "^2.1.2", "@csstools/css-color-parser": "^3.0.8", "@csstools/css-parser-algorithms": "^3.0.4", "@csstools/css-tokenizer": "^3.0.3", "lru-cache": "^10.4.3" } }, "sha512-hpRD68SV2OMcZCsrbdkccTw5FXjNDLo5OuqSHyHZfwweGsDWZwDJ2+gONyNAbazZclobMirACLw0lk8WVxIqxA=="],

    "@biomejs/biome": ["@biomejs/biome@1.9.4", "", { "optionalDependencies": { "@biomejs/cli-darwin-arm64": "1.9.4", "@biomejs/cli-darwin-x64": "1.9.4", "@biomejs/cli-linux-arm64": "1.9.4", "@biomejs/cli-linux-arm64-musl": "1.9.4", "@biomejs/cli-linux-x64": "1.9.4", "@biomejs/cli-linux-x64-musl": "1.9.4", "@biomejs/cli-win32-arm64": "1.9.4", "@biomejs/cli-win32-x64": "1.9.4" }, "bin": { "biome": "bin/biome" } }, "sha512-1rkd7G70+o9KkTn5KLmDYXihGoTaIGO9PIIN2ZB7UJxFrWw04CZHPYiMRjYsaDvVV7hP1dYNRLxSANLaBFGpog=="],

    "@biomejs/cli-darwin-arm64": ["@biomejs/cli-darwin-arm64@1.9.4", "", { "os": "darwin", "cpu": "arm64" }, "sha512-bFBsPWrNvkdKrNCYeAp+xo2HecOGPAy9WyNyB/jKnnedgzl4W4Hb9ZMzYNbf8dMCGmUdSavlYHiR01QaYR58cw=="],

    "@biomejs/cli-darwin-x64": ["@biomejs/cli-darwin-x64@1.9.4", "", { "os": "darwin", "cpu": "x64" }, "sha512-ngYBh/+bEedqkSevPVhLP4QfVPCpb+4BBe2p7Xs32dBgs7rh9nY2AIYUL6BgLw1JVXV8GlpKmb/hNiuIxfPfZg=="],

    "@biomejs/cli-linux-arm64": ["@biomejs/cli-linux-arm64@1.9.4", "", { "os": "linux", "cpu": "arm64" }, "sha512-fJIW0+LYujdjUgJJuwesP4EjIBl/N/TcOX3IvIHJQNsAqvV2CHIogsmA94BPG6jZATS4Hi+xv4SkBBQSt1N4/g=="],

    "@biomejs/cli-linux-arm64-musl": ["@biomejs/cli-linux-arm64-musl@1.9.4", "", { "os": "linux", "cpu": "arm64" }, "sha512-v665Ct9WCRjGa8+kTr0CzApU0+XXtRgwmzIf1SeKSGAv+2scAlW6JR5PMFo6FzqqZ64Po79cKODKf3/AAmECqA=="],

    "@biomejs/cli-linux-x64": ["@biomejs/cli-linux-x64@1.9.4", "", { "os": "linux", "cpu": "x64" }, "sha512-lRCJv/Vi3Vlwmbd6K+oQ0KhLHMAysN8lXoCI7XeHlxaajk06u7G+UsFSO01NAs5iYuWKmVZjmiOzJ0OJmGsMwg=="],

    "@biomejs/cli-linux-x64-musl": ["@biomejs/cli-linux-x64-musl@1.9.4", "", { "os": "linux", "cpu": "x64" }, "sha512-gEhi/jSBhZ2m6wjV530Yy8+fNqG8PAinM3oV7CyO+6c3CEh16Eizm21uHVsyVBEB6RIM8JHIl6AGYCv6Q6Q9Tg=="],

    "@biomejs/cli-win32-arm64": ["@biomejs/cli-win32-arm64@1.9.4", "", { "os": "win32", "cpu": "arm64" }, "sha512-tlbhLk+WXZmgwoIKwHIHEBZUwxml7bRJgk0X2sPyNR3S93cdRq6XulAZRQJ17FYGGzWne0fgrXBKpl7l4M87Hg=="],

    "@biomejs/cli-win32-x64": ["@biomejs/cli-win32-x64@1.9.4", "", { "os": "win32", "cpu": "x64" }, "sha512-8Y5wMhVIPaWe6jw2H+KlEm4wP/f7EW3810ZLmDlrEEy5KvBsb9ECEfu/kMWD484ijfQ8+nIi0giMgu9g1UAuuA=="],

    "@csstools/color-helpers": ["@csstools/color-helpers@5.0.2", "", {}, "sha512-JqWH1vsgdGcw2RR6VliXXdA0/59LttzlU8UlRT/iUUsEeWfYq8I+K0yhihEUTTHLRm1EXvpsCx3083EU15ecsA=="],

    "@csstools/css-calc": ["@csstools/css-calc@2.1.2", "", { "peerDependencies": { "@csstools/css-parser-algorithms": "^3.0.4", "@csstools/css-tokenizer": "^3.0.3" } }, "sha512-TklMyb3uBB28b5uQdxjReG4L80NxAqgrECqLZFQbyLekwwlcDDS8r3f07DKqeo8C4926Br0gf/ZDe17Zv4wIuw=="],

    "@csstools/css-color-parser": ["@csstools/css-color-parser@3.0.8", "", { "dependencies": { "@csstools/color-helpers": "^5.0.2", "@csstools/css-calc": "^2.1.2" }, "peerDependencies": { "@csstools/css-parser-algorithms": "^3.0.4", "@csstools/css-tokenizer": "^3.0.3" } }, "sha512-pdwotQjCCnRPuNi06jFuP68cykU1f3ZWExLe/8MQ1LOs8Xq+fTkYgd+2V8mWUWMrOn9iS2HftPVaMZDaXzGbhQ=="],

    "@csstools/css-parser-algorithms": ["@csstools/css-parser-algorithms@3.0.4", "", { "peerDependencies": { "@csstools/css-tokenizer": "^3.0.3" } }, "sha512-Up7rBoV77rv29d3uKHUIVubz1BTcgyUK72IvCQAbfbMv584xHcGKCKbWh7i8hPrRJ7qU4Y8IO3IY9m+iTB7P3A=="],

    "@csstools/css-tokenizer": ["@csstools/css-tokenizer@3.0.3", "", {}, "sha512-UJnjoFsmxfKUdNYdWgOB0mWUypuLvAfQPH1+pyvRJs6euowbFkFC6P13w1l8mJyi3vxYMxc9kld5jZEGRQs6bw=="],

    "@mixmark-io/domino": ["@mixmark-io/domino@2.2.0", "", {}, "sha512-Y28PR25bHXUg88kCV7nivXrP2Nj2RueZ3/l/jdx6J9f8J4nsEGcgX0Qe6lt7Pa+J79+kPiJU3LguR6O/6zrLOw=="],

    "@types/bun": ["@types/bun@1.2.5", "", { "dependencies": { "bun-types": "1.2.5" } }, "sha512-w2OZTzrZTVtbnJew1pdFmgV99H0/L+Pvw+z1P67HaR18MHOzYnTYOi6qzErhK8HyT+DB782ADVPPE92Xu2/Opg=="],

    "@types/jsdom": ["@types/jsdom@21.1.7", "", { "dependencies": { "@types/node": "*", "@types/tough-cookie": "*", "parse5": "^7.0.0" } }, "sha512-yOriVnggzrnQ3a9OKOCxaVuSug3w3/SbOj5i7VwXWZEyUNl3bLF9V3MfxGbZKuwqJOQyRfqXyROBB1CoZLFWzA=="],

    "@types/node": ["@types/node@22.13.10", "", { "dependencies": { "undici-types": "~6.20.0" } }, "sha512-I6LPUvlRH+O6VRUqYOcMudhaIdUVWfsjnZavnsraHvpBwaEyMN29ry+0UVJhImYL16xsscu0aske3yA+uPOWfw=="],

    "@types/tough-cookie": ["@types/tough-cookie@4.0.5", "", {}, "sha512-/Ad8+nIOV7Rl++6f1BdKxFSMgmoqEoYbHRpPcx3JEfv8VRsQe9Z4mCXeJBzxs7mbHY/XOZZuXlRNfhpVPbs6ZA=="],

    "@types/turndown": ["@types/turndown@5.0.5", "", {}, "sha512-TL2IgGgc7B5j78rIccBtlYAnkuv8nUQqhQc+DSYV5j9Be9XOcm/SKOVRuA47xAVI3680Tk9B1d8flK2GWT2+4w=="],

    "@types/ws": ["@types/ws@8.5.14", "", { "dependencies": { "@types/node": "*" } }, "sha512-bd/YFLW+URhBzMXurx7lWByOu+xzU9+kb3RboOteXYDfW+tr+JZa99OyNmPINEGB/ahzKrEuc8rcv4gnpJmxTw=="],

    "agent-base": ["agent-base@7.1.3", "", {}, "sha512-jRR5wdylq8CkOe6hei19GGZnxM6rBGwFl3Bg0YItGDimvjGtAvdZk4Pu6Cl4u4Igsws4a1fd1Vq3ezrhn4KmFw=="],

    "asynckit": ["asynckit@0.4.0", "", {}, "sha512-Oei9OH4tRh0YqU3GxhX79dM/mwVgvbZJaSNaRk+bshkj0S5cfHcgYakreBjrHwatXKbz+IoIdYLxrKim2MjW0Q=="],

    "boolbase": ["boolbase@1.0.0", "", {}, "sha512-JZOSA7Mo9sNGB8+UjSgzdLtokWAky1zbztM3WRLCbZ70/3cTANmQmOdR7y2g+J0e2WXywy1yS468tY+IruqEww=="],

    "bun-types": ["bun-types@1.2.5", "", { "dependencies": { "@types/node": "*", "@types/ws": "~8.5.10" } }, "sha512-3oO6LVGGRRKI4kHINx5PIdIgnLRb7l/SprhzqXapmoYkFl5m4j6EvALvbDVuuBFaamB46Ap6HCUxIXNLCGy+tg=="],

    "call-bind-apply-helpers": ["call-bind-apply-helpers@1.0.2", "", { "dependencies": { "es-errors": "^1.3.0", "function-bind": "^1.1.2" } }, "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ=="],

    "cheerio": ["cheerio@1.0.0", "", { "dependencies": { "cheerio-select": "^2.1.0", "dom-serializer": "^2.0.0", "domhandler": "^5.0.3", "domutils": "^3.1.0", "encoding-sniffer": "^0.2.0", "htmlparser2": "^9.1.0", "parse5": "^7.1.2", "parse5-htmlparser2-tree-adapter": "^7.0.0", "parse5-parser-stream": "^7.1.2", "undici": "^6.19.5", "whatwg-mimetype": "^4.0.0" } }, "sha512-quS9HgjQpdaXOvsZz82Oz7uxtXiy6UIsIQcpBj7HRw2M63Skasm9qlDocAM7jNuaxdhpPU7c4kJN+gA5MCu4ww=="],

    "cheerio-select": ["cheerio-select@2.1.0", "", { "dependencies": { "boolbase": "^1.0.0", "css-select": "^5.1.0", "css-what": "^6.1.0", "domelementtype": "^2.3.0", "domhandler": "^5.0.3", "domutils": "^3.0.1" } }, "sha512-9v9kG0LvzrlcungtnJtpGNxY+fzECQKhK4EGJX2vByejiMX84MFNQw4UxPJl3bFbTMw+Dfs37XaIkCwTZfLh4g=="],

    "combined-stream": ["combined-stream@1.0.8", "", { "dependencies": { "delayed-stream": "~1.0.0" } }, "sha512-FQN4MRfuJeHf7cBbBMJFXhKSDq+2kAArBlmRBvcvFE5BB1HZKXtSFASDhdlz9zOYwxh8lDdnvmMOe/+5cdoEdg=="],

    "css-select": ["css-select@5.1.0", "", { "dependencies": { "boolbase": "^1.0.0", "css-what": "^6.1.0", "domhandler": "^5.0.2", "domutils": "^3.0.1", "nth-check": "^2.0.1" } }, "sha512-nwoRF1rvRRnnCqqY7updORDsuqKzqYJ28+oSMaJMMgOauh3fvwHqMS7EZpIPqK8GL+g9mKxF1vP/ZjSeNjEVHg=="],

    "css-what": ["css-what@6.1.0", "", {}, "sha512-HTUrgRJ7r4dsZKU6GjmpfRK1O76h97Z8MfS1G0FozR+oF2kG6Vfe8JE6zwrkbxigziPHinCJ+gCPjA9EaBDtRw=="],

    "cssstyle": ["cssstyle@4.3.0", "", { "dependencies": { "@asamuzakjp/css-color": "^3.1.1", "rrweb-cssom": "^0.8.0" } }, "sha512-6r0NiY0xizYqfBvWp1G7WXJ06/bZyrk7Dc6PHql82C/pKGUTKu4yAX4Y8JPamb1ob9nBKuxWzCGTRuGwU3yxJQ=="],

    "data-urls": ["data-urls@5.0.0", "", { "dependencies": { "whatwg-mimetype": "^4.0.0", "whatwg-url": "^14.0.0" } }, "sha512-ZYP5VBHshaDAiVZxjbRVcFJpc+4xGgT0bK3vzy1HLN8jTO975HEbuYzZJcHoQEY5K1a0z8YayJkyVETa08eNTg=="],

    "debug": ["debug@4.4.0", "", { "dependencies": { "ms": "^2.1.3" } }, "sha512-6WTZ/IxCY/T6BALoZHaE4ctp9xm+Z5kY/pzYaCHRFeyVhojxlrm+46y68HA6hr0TcwEssoxNiDEUJQjfPZ/RYA=="],

    "decimal.js": ["decimal.js@10.5.0", "", {}, "sha512-8vDa8Qxvr/+d94hSh5P3IJwI5t8/c0KsMp+g8bNw9cY2icONa5aPfvKeieW1WlG0WQYwwhJ7mjui2xtiePQSXw=="],

    "delayed-stream": ["delayed-stream@1.0.0", "", {}, "sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ=="],

    "dom-serializer": ["dom-serializer@2.0.0", "", { "dependencies": { "domelementtype": "^2.3.0", "domhandler": "^5.0.2", "entities": "^4.2.0" } }, "sha512-wIkAryiqt/nV5EQKqQpo3SToSOV9J0DnbJqwK7Wv/Trc92zIAYZ4FlMu+JPFW1DfGFt81ZTCGgDEabffXeLyJg=="],

    "domelementtype": ["domelementtype@2.3.0", "", {}, "sha512-OLETBj6w0OsagBwdXnPdN0cnMfF9opN69co+7ZrbfPGrdpPVNBUj02spi6B1N7wChLQiPn4CSH/zJvXw56gmHw=="],

    "domhandler": ["domhandler@5.0.3", "", { "dependencies": { "domelementtype": "^2.3.0" } }, "sha512-cgwlv/1iFQiFnU96XXgROh8xTeetsnJiDsTc7TYCLFd9+/WNkIqPTxiM/8pSd8VIrhXGTf1Ny1q1hquVqDJB5w=="],

    "domutils": ["domutils@3.2.2", "", { "dependencies": { "dom-serializer": "^2.0.0", "domelementtype": "^2.3.0", "domhandler": "^5.0.3" } }, "sha512-6kZKyUajlDuqlHKVX1w7gyslj9MPIXzIFiz/rGu35uC1wMi+kMhQwGhl4lt9unC9Vb9INnY9Z3/ZA3+FhASLaw=="],

    "dunder-proto": ["dunder-proto@1.0.1", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.1", "es-errors": "^1.3.0", "gopd": "^1.2.0" } }, "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A=="],

    "encoding-sniffer": ["encoding-sniffer@0.2.0", "", { "dependencies": { "iconv-lite": "^0.6.3", "whatwg-encoding": "^3.1.1" } }, "sha512-ju7Wq1kg04I3HtiYIOrUrdfdDvkyO9s5XM8QAj/bN61Yo/Vb4vgJxy5vi4Yxk01gWHbrofpPtpxM8bKger9jhg=="],

    "entities": ["entities@4.5.0", "", {}, "sha512-V0hjH4dGPh9Ao5p0MoRY6BVqtwCjhz6vI5LT8AJ55H+4g9/4vbHx1I54fS0XuclLhDHArPQCiMjDxjaL8fPxhw=="],

    "es-define-property": ["es-define-property@1.0.1", "", {}, "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g=="],

    "es-errors": ["es-errors@1.3.0", "", {}, "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw=="],

    "es-object-atoms": ["es-object-atoms@1.1.1", "", { "dependencies": { "es-errors": "^1.3.0" } }, "sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA=="],

    "es-set-tostringtag": ["es-set-tostringtag@2.1.0", "", { "dependencies": { "es-errors": "^1.3.0", "get-intrinsic": "^1.2.6", "has-tostringtag": "^1.0.2", "hasown": "^2.0.2" } }, "sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA=="],

    "form-data": ["form-data@4.0.2", "", { "dependencies": { "asynckit": "^0.4.0", "combined-stream": "^1.0.8", "es-set-tostringtag": "^2.1.0", "mime-types": "^2.1.12" } }, "sha512-hGfm/slu0ZabnNt4oaRZ6uREyfCj6P4fT/n6A1rGV+Z0VdGXjfOhVUpkn6qVQONHGIFwmveGXyDs75+nr6FM8w=="],

    "function-bind": ["function-bind@1.1.2", "", {}, "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA=="],

    "get-intrinsic": ["get-intrinsic@1.3.0", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.2", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.1", "function-bind": "^1.1.2", "get-proto": "^1.0.1", "gopd": "^1.2.0", "has-symbols": "^1.1.0", "hasown": "^2.0.2", "math-intrinsics": "^1.1.0" } }, "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ=="],

    "get-proto": ["get-proto@1.0.1", "", { "dependencies": { "dunder-proto": "^1.0.1", "es-object-atoms": "^1.0.0" } }, "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g=="],

    "gopd": ["gopd@1.2.0", "", {}, "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg=="],

    "has-symbols": ["has-symbols@1.1.0", "", {}, "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ=="],

    "has-tostringtag": ["has-tostringtag@1.0.2", "", { "dependencies": { "has-symbols": "^1.0.3" } }, "sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw=="],

    "hasown": ["hasown@2.0.2", "", { "dependencies": { "function-bind": "^1.1.2" } }, "sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ=="],

    "html-encoding-sniffer": ["html-encoding-sniffer@4.0.0", "", { "dependencies": { "whatwg-encoding": "^3.1.1" } }, "sha512-Y22oTqIU4uuPgEemfz7NDJz6OeKf12Lsu+QC+s3BVpda64lTiMYCyGwg5ki4vFxkMwQdeZDl2adZoqUgdFuTgQ=="],

    "htmlparser2": ["htmlparser2@9.1.0", "", { "dependencies": { "domelementtype": "^2.3.0", "domhandler": "^5.0.3", "domutils": "^3.1.0", "entities": "^4.5.0" } }, "sha512-5zfg6mHUoaer/97TxnGpxmbR7zJtPwIYFMZ/H5ucTlPZhKvtum05yiPK3Mgai3a0DyVxv7qYqoweaEd2nrYQzQ=="],

    "http-proxy-agent": ["http-proxy-agent@7.0.2", "", { "dependencies": { "agent-base": "^7.1.0", "debug": "^4.3.4" } }, "sha512-T1gkAiYYDWYx3V5Bmyu7HcfcvL7mUrTWiM6yOfa3PIphViJ/gFPbvidQ+veqSOHci/PxBcDabeUNCzpOODJZig=="],

    "https-proxy-agent": ["https-proxy-agent@7.0.6", "", { "dependencies": { "agent-base": "^7.1.2", "debug": "4" } }, "sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw=="],

    "iconv-lite": ["iconv-lite@0.6.3", "", { "dependencies": { "safer-buffer": ">= 2.1.2 < 3.0.0" } }, "sha512-4fCk79wshMdzMp2rH06qWrJE4iolqLhCUH+OiuIgU++RB0+94NlDL81atO7GX55uUKueo0txHNtvEyI6D7WdMw=="],

    "is-potential-custom-element-name": ["is-potential-custom-element-name@1.0.1", "", {}, "sha512-bCYeRA2rVibKZd+s2625gGnGF/t7DSqDs4dP7CrLA1m7jKWz6pps0LpYLJN8Q64HtmPKJ1hrN3nzPNKFEKOUiQ=="],

    "jsdom": ["jsdom@24.1.3", "", { "dependencies": { "cssstyle": "^4.0.1", "data-urls": "^5.0.0", "decimal.js": "^10.4.3", "form-data": "^4.0.0", "html-encoding-sniffer": "^4.0.0", "http-proxy-agent": "^7.0.2", "https-proxy-agent": "^7.0.5", "is-potential-custom-element-name": "^1.0.1", "nwsapi": "^2.2.12", "parse5": "^7.1.2", "rrweb-cssom": "^0.7.1", "saxes": "^6.0.0", "symbol-tree": "^3.2.4", "tough-cookie": "^4.1.4", "w3c-xmlserializer": "^5.0.0", "webidl-conversions": "^7.0.0", "whatwg-encoding": "^3.1.1", "whatwg-mimetype": "^4.0.0", "whatwg-url": "^14.0.0", "ws": "^8.18.0", "xml-name-validator": "^5.0.0" }, "peerDependencies": { "canvas": "^2.11.2" }, "optionalPeers": ["canvas"] }, "sha512-MyL55p3Ut3cXbeBEG7Hcv0mVM8pp8PBNWxRqchZnSfAiES1v1mRnMeFfaHWIPULpwsYfvO+ZmMZz5tGCnjzDUQ=="],

    "lru-cache": ["lru-cache@10.4.3", "", {}, "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ=="],

    "marked": ["marked@12.0.2", "", { "bin": { "marked": "bin/marked.js" } }, "sha512-qXUm7e/YKFoqFPYPa3Ukg9xlI5cyAtGmyEIzMfW//m6kXwCy2Ps9DYf5ioijFKQ8qyuscrHoY04iJGctu2Kg0Q=="],

    "math-intrinsics": ["math-intrinsics@1.1.0", "", {}, "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g=="],

    "mime-db": ["mime-db@1.52.0", "", {}, "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg=="],

    "mime-types": ["mime-types@2.1.35", "", { "dependencies": { "mime-db": "1.52.0" } }, "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw=="],

    "ms": ["ms@2.1.3", "", {}, "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA=="],

    "nth-check": ["nth-check@2.1.1", "", { "dependencies": { "boolbase": "^1.0.0" } }, "sha512-lqjrjmaOoAnWfMmBPL+XNnynZh2+swxiX3WUE0s4yEHI6m+AwrK2UZOimIRl3X/4QctVqS8AiZjFqyOGrMXb/w=="],

    "nwsapi": ["nwsapi@2.2.19", "", {}, "sha512-94bcyI3RsqiZufXjkr3ltkI86iEl+I7uiHVDtcq9wJUTwYQJ5odHDeSzkkrRzi80jJ8MaeZgqKjH1bAWAFw9bA=="],

    "ollama": ["ollama@0.5.14", "", { "dependencies": { "whatwg-fetch": "^3.6.20" } }, "sha512-pvOuEYa2WkkAumxzJP0RdEYHkbZ64AYyyUszXVX7ruLvk5L+EiO2G71da2GqEQ4IAk4j6eLoUbGk5arzFT1wJA=="],

    "p-limit": ["p-limit@5.0.0", "", { "dependencies": { "yocto-queue": "^1.0.0" } }, "sha512-/Eaoq+QyLSiXQ4lyYV23f14mZRQcXnxfHrN0vCai+ak9G0pp9iEQukIIZq5NccEvwRB8PUnZT0KsOoDCINS1qQ=="],

    "parse5": ["parse5@7.2.1", "", { "dependencies": { "entities": "^4.5.0" } }, "sha512-BuBYQYlv1ckiPdQi/ohiivi9Sagc9JG+Ozs0r7b/0iK3sKmrb0b9FdWdBbOdx6hBCM/F9Ir82ofnBhtZOjCRPQ=="],

    "parse5-htmlparser2-tree-adapter": ["parse5-htmlparser2-tree-adapter@7.1.0", "", { "dependencies": { "domhandler": "^5.0.3", "parse5": "^7.0.0" } }, "sha512-ruw5xyKs6lrpo9x9rCZqZZnIUntICjQAd0Wsmp396Ul9lN/h+ifgVV1x1gZHi8euej6wTfpqX8j+BFQxF0NS/g=="],

    "parse5-parser-stream": ["parse5-parser-stream@7.1.2", "", { "dependencies": { "parse5": "^7.0.0" } }, "sha512-JyeQc9iwFLn5TbvvqACIF/VXG6abODeB3Fwmv/TGdLk2LfbWkaySGY72at4+Ty7EkPZj854u4CrICqNk2qIbow=="],

    "psl": ["psl@1.15.0", "", { "dependencies": { "punycode": "^2.3.1" } }, "sha512-JZd3gMVBAVQkSs6HdNZo9Sdo0LNcQeMNP3CozBJb3JYC/QUYZTnKxP+f8oWRX4rHP5EurWxqAHTSwUCjlNKa1w=="],

    "punycode": ["punycode@2.3.1", "", {}, "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg=="],

    "querystringify": ["querystringify@2.2.0", "", {}, "sha512-FIqgj2EUvTa7R50u0rGsyTftzjYmv/a3hO345bZNrqabNqjtgiDMgmo4mkUjd+nzU5oF3dClKqFIPUKybUyqoQ=="],

    "requires-port": ["requires-port@1.0.0", "", {}, "sha512-KigOCHcocU3XODJxsu8i/j8T9tzT4adHiecwORRQ0ZZFcp7ahwXuRU1m+yuO90C5ZUyGeGfocHDI14M3L3yDAQ=="],

    "rrweb-cssom": ["rrweb-cssom@0.7.1", "", {}, "sha512-TrEMa7JGdVm0UThDJSx7ddw5nVm3UJS9o9CCIZ72B1vSyEZoziDqBYP3XIoi/12lKrJR8rE3jeFHMok2F/Mnsg=="],

    "safer-buffer": ["safer-buffer@2.1.2", "", {}, "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg=="],

    "saxes": ["saxes@6.0.0", "", { "dependencies": { "xmlchars": "^2.2.0" } }, "sha512-xAg7SOnEhrm5zI3puOOKyy1OMcMlIJZYNJY7xLBwSze0UjhPLnWfj2GF2EpT0jmzaJKIWKHLsaSSajf35bcYnA=="],

    "symbol-tree": ["symbol-tree@3.2.4", "", {}, "sha512-9QNk5KwDF+Bvz+PyObkmSYjI5ksVUYtjW7AU22r2NKcfLJcXp96hkDWU3+XndOsUb+AQ9QhfzfCT2O+CNWT5Tw=="],

    "tough-cookie": ["tough-cookie@4.1.4", "", { "dependencies": { "psl": "^1.1.33", "punycode": "^2.1.1", "universalify": "^0.2.0", "url-parse": "^1.5.3" } }, "sha512-Loo5UUvLD9ScZ6jh8beX1T6sO1w2/MpCRpEP7V280GKMVUQ0Jzar2U3UJPsrdbziLEMMhu3Ujnq//rhiFuIeag=="],

    "tr46": ["tr46@5.1.0", "", { "dependencies": { "punycode": "^2.3.1" } }, "sha512-IUWnUK7ADYR5Sl1fZlO1INDUhVhatWl7BtJWsIhwJ0UAK7ilzzIa8uIqOO/aYVWHZPJkKbEL+362wrzoeRF7bw=="],

    "turndown": ["turndown@7.2.0", "", { "dependencies": { "@mixmark-io/domino": "^2.2.0" } }, "sha512-eCZGBN4nNNqM9Owkv9HAtWRYfLA4h909E/WGAWWBpmB275ehNhZyk87/Tpvjbp0jjNl9XwCsbe6bm6CqFsgD+A=="],

    "typescript": ["typescript@5.8.2", "", { "bin": { "tsc": "bin/tsc", "tsserver": "bin/tsserver" } }, "sha512-aJn6wq13/afZp/jT9QZmwEjDqqvSGp1VT5GVg+f/t6/oVyrgXM6BY1h9BRh/O5p3PlUPAe+WuiEZOmb/49RqoQ=="],

    "undici": ["undici@6.21.2", "", {}, "sha512-uROZWze0R0itiAKVPsYhFov9LxrPMHLMEQFszeI2gCN6bnIIZ8twzBCJcN2LJrBBLfrP0t1FW0g+JmKVl8Vk1g=="],

    "undici-types": ["undici-types@6.20.0", "", {}, "sha512-Ny6QZ2Nju20vw1SRHe3d9jVu6gJ+4e3+MMpqu7pqE5HT6WsTSlce++GQmK5UXS8mzV8DSYHrQH+Xrf2jVcuKNg=="],

    "universalify": ["universalify@0.2.0", "", {}, "sha512-CJ1QgKmNg3CwvAv/kOFmtnEN05f0D/cn9QntgNOQlQF9dgvVTHj3t+8JPdjqawCHk7V/KA+fbUqzZ9XWhcqPUg=="],

    "url-parse": ["url-parse@1.5.10", "", { "dependencies": { "querystringify": "^2.1.1", "requires-port": "^1.0.0" } }, "sha512-WypcfiRhfeUP9vvF0j6rw0J3hrWrw6iZv3+22h6iRMJ/8z1Tj6XfLP4DsUix5MhMPnXpiHDoKyoZ/bdCkwBCiQ=="],

    "w3c-xmlserializer": ["w3c-xmlserializer@5.0.0", "", { "dependencies": { "xml-name-validator": "^5.0.0" } }, "sha512-o8qghlI8NZHU1lLPrpi2+Uq7abh4GGPpYANlalzWxyWteJOCsr/P+oPBA49TOLu5FTZO4d3F9MnWJfiMo4BkmA=="],

    "webidl-conversions": ["webidl-conversions@7.0.0", "", {}, "sha512-VwddBukDzu71offAQR975unBIGqfKZpM+8ZX6ySk8nYhVoo5CYaZyzt3YBvYtRtO+aoGlqxPg/B87NGVZ/fu6g=="],

    "whatwg-encoding": ["whatwg-encoding@3.1.1", "", { "dependencies": { "iconv-lite": "0.6.3" } }, "sha512-6qN4hJdMwfYBtE3YBTTHhoeuUrDBPZmbQaxWAqSALV/MeEnR5z1xd8UKud2RAkFoPkmB+hli1TZSnyi84xz1vQ=="],

    "whatwg-fetch": ["whatwg-fetch@3.6.20", "", {}, "sha512-EqhiFU6daOA8kpjOWTL0olhVOF3i7OrFzSYiGsEMB8GcXS+RrzauAERX65xMeNWVqxA6HXH2m69Z9LaKKdisfg=="],

    "whatwg-mimetype": ["whatwg-mimetype@4.0.0", "", {}, "sha512-QaKxh0eNIi2mE9p2vEdzfagOKHCcj1pJ56EEHGQOVxp8r9/iszLUUV7v89x9O1p/T+NlTM5W7jW6+cz4Fq1YVg=="],

    "whatwg-url": ["whatwg-url@14.2.0", "", { "dependencies": { "tr46": "^5.1.0", "webidl-conversions": "^7.0.0" } }, "sha512-De72GdQZzNTUBBChsXueQUnPKDkg/5A5zp7pFDuQAj5UFoENpiACU0wlCvzpAGnTkj++ihpKwKyYewn/XNUbKw=="],

    "ws": ["ws@8.18.1", "", { "peerDependencies": { "bufferutil": "^4.0.1", "utf-8-validate": ">=5.0.2" }, "optionalPeers": ["bufferutil", "utf-8-validate"] }, "sha512-RKW2aJZMXeMxVpnZ6bck+RswznaxmzdULiBr6KY7XkTnW8uvt0iT9H5DkHUChXrc+uurzwa0rVI16n/Xzjdz1w=="],

    "xml-name-validator": ["xml-name-validator@5.0.0", "", {}, "sha512-EvGK8EJ3DhaHfbRlETOWAS5pO9MZITeauHKJyb8wyajUfQUenkIg2MvLDTZ4T/TgIcm3HU0TFBgWWboAZ30UHg=="],

    "xmlchars": ["xmlchars@2.2.0", "", {}, "sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw=="],

    "yocto-queue": ["yocto-queue@1.2.0", "", {}, "sha512-KHBC7z61OJeaMGnF3wqNZj+GGNXOyypZviiKpQeiHirG5Ib1ImwcLBH70rbMSkKfSmUNBsdf2PwaEJtKvgmkNw=="],

    "cssstyle/rrweb-cssom": ["rrweb-cssom@0.8.0", "", {}, "sha512-guoltQEx+9aMf2gDZ0s62EcV8lsXR+0w8915TC3ITdn2YueuNjdAYh/levpU9nFaoChh9RUS5ZdQMrKfVEN9tw=="],
  }
}
```

## File: package.json
```json
{
	"name": "@aelysia.labs/nimcrawl",
	"module": "src/index.ts",
	"type": "module",
	"devDependencies": {
		"@biomejs/biome": "^1.9.4",
		"@types/bun": "latest",
		"@types/jsdom": "^21.1.7",
		"@types/turndown": "^5.0.5"
	},
	"dependencies": {
		"cheerio": "^1.0.0-rc.12",
		"jsdom": "^24.0.0",
		"marked": "^12.0.0",
		"ollama": "^0.5.14",
		"p-limit": "^5.0.0",
		"turndown": "^7.1.2"
	},
	"peerDependencies": {
		"typescript": "^5"
	},
	"scripts": {
		"format": "biome format --write .",
		"lint": "biome lint .",
		"check": "biome check --apply .",
		"start": "bun src/index.ts",
		"test": "bun test"
	}
}
```

## File: tsconfig.json
```json
{
	"compilerOptions": {
		// Environment setup & latest features
		"lib": ["esnext"],
		"target": "ESNext",
		"module": "ESNext",
		"moduleDetection": "force",
		"jsx": "react-jsx",
		"allowJs": true,

		// Bundler mode
		"moduleResolution": "bundler",
		"allowImportingTsExtensions": true,
		"verbatimModuleSyntax": true,
		"noEmit": true,

		// Best practices
		"strict": true,
		"skipLibCheck": true,
		"noFallthroughCasesInSwitch": true,
		"noUncheckedIndexedAccess": true,

		// Some stricter flags (disabled by default)
		"noUnusedLocals": false,
		"noUnusedParameters": false,
		"noPropertyAccessFromIndexSignature": false
	}
}
```
