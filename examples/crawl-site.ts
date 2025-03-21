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
