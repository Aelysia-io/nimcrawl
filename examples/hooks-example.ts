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
  const startUrl = "https://docs.unity3d.com/Packages/com.unity.netcode@1.5/manual/index.html";

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
        "com.unity.netcode@1.5/*",
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