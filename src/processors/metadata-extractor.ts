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
