/**
 * LLM-Based Extraction Example
 *
 * This example demonstrates how to extract structured data from websites
 * using local LLMs with Ollama integration.
 */

import { scrape } from "../src/index";

async function llmExtractionExample() {
  console.log("🤖 LLM-based extraction example");

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