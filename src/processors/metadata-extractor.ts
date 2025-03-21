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

	// Extract title
	metadata.title = $("title").text().trim() || undefined;

	// Extract description
	metadata.description =
		$('meta[name="description"]').attr("content") ||
		$('meta[property="og:description"]').attr("content") ||
		undefined;

	// Extract language
	metadata.language =
		$("html").attr("lang") ||
		$('meta[http-equiv="content-language"]').attr("content") ||
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

	return metadata;
}
