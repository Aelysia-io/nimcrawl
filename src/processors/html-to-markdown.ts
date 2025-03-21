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
