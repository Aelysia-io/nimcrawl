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