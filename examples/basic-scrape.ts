/**
 * Basic Scraping Example
 *
 * This example demonstrates how to scrape a single URL and extract
 * different formats of data including markdown, HTML, and links.
 */

import { scrape } from "../src/index";

async function basicScrapeExample() {
	console.log("🔍 Basic scraping example");

	// Simple scrape with multiple output formats
	const result = await scrape("https://example.com", {
		formats: ["markdown", "html", "links"],
		extractMetadata: true,
	});

	if (result.success && result.data) {
		console.log("✅ Scrape successful");

		// Display metadata
		if (result.data.metadata) {
			console.log("\n📝 Metadata:");
			console.log(`Title: ${result.data.metadata.title}`);
			console.log(`Description: ${result.data.metadata.description}`);
			console.log(`Language: ${result.data.metadata.language}`);
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

// Run the example if this file is executed directly
if (import.meta.main) {
	basicScrapeExample().catch((error) => console.error("Error:", error));
}
