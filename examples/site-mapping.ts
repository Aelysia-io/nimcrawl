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
