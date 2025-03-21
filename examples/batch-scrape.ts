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
