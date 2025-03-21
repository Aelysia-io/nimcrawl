/**
 * Smart Fetcher Module
 *
 * Handles fetching content with intelligent fallback to jsdom for JavaScript-heavy sites
 */

import { JSDOM } from "jsdom";
import type { ContentType, FetchOptions } from "../types";

/**
 * Detects if a page is likely to require JavaScript for rendering its content
 */
export function detectContentType(html: string, url: string): ContentType {
	// Check for common JavaScript frameworks
	const hasReact = html.includes("react");
	const hasVue = html.includes("vue");
	const hasAngular = html.includes("angular");
	const hasNextJS = html.includes("__NEXT_DATA__");

	// Check for loading patterns or empty content containers
	const hasLoadingIndicators =
		html.includes("loading") || html.includes("spinner");
	const hasDynamicContentMarkers =
		html.includes("data-dynamic") || html.includes("js-content");

	// Check if the main content seems to be missing
	const hasMinimalContent =
		html.split("<p>").length < 3 && html.split("<div").length < 10;

	// Extract content type from meta tags if present
	const contentTypeMatch = html.match(
		/<meta[^>]*content-type[^>]*content=["']([^"']*)["']/i,
	);
	const format = contentTypeMatch?.[1] ?? "text/html";

	const needsJavaScript =
		hasReact ||
		hasVue ||
		hasAngular ||
		hasNextJS ||
		(hasLoadingIndicators && hasMinimalContent) ||
		hasDynamicContentMarkers;

	return {
		isStatic: !needsJavaScript,
		needsJavaScript,
		format,
	};
}

/**
 * Fetches content with regular fetch API
 */
export async function simpleFetch(
	url: string,
	options: FetchOptions = {},
): Promise<{
	html: string;
	status: number;
	headers: Record<string, string>;
}> {
	const controller = new AbortController();
	const timeout = options.timeout ?? 30000;

	// Set up timeout
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			headers: options.headers ?? {
				"User-Agent": "Mozilla/5.0 (compatible; NimCrawler/1.0;)",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
			},
			signal: controller.signal,
			redirect: options.followRedirects === false ? "manual" : "follow",
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const html = await response.text();

		// Convert headers to record
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		return {
			html,
			status: response.status,
			headers,
		};
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error) {
			throw new Error(`Failed to fetch ${url}: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Fetches content using jsdom for JavaScript-heavy sites
 */
export async function jsDomFetch(
	url: string,
	options: FetchOptions = {},
): Promise<{
	html: string;
	status: number;
	headers: Record<string, string>;
}> {
	try {
		const jsdom = new JSDOM("", {
			url,
			referrer: options.headers?.Referer,
			includeNodeLocations: false,
			storageQuota: 10000000,
			pretendToBeVisual: true,
			resources: "usable",
			runScripts: "dangerously",
		});

		// Wait for the page to load
		await new Promise((resolve) => {
			jsdom.window.addEventListener("load", () => {
				setTimeout(resolve, 2000); // Additional wait for scripts
			});

			// Timeout fallback
			setTimeout(resolve, options.timeout ?? 30000);
		});

		const html = jsdom.serialize();
		jsdom.window.close();

		return {
			html,
			status: 200, // Assuming success if we got this far
			headers: {}, // jsdom doesn't provide response headers
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch with jsdom ${url}: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Smart fetcher that automatically detects and uses the appropriate method
 */
export async function smartFetch(
	url: string,
	options: FetchOptions = {},
): Promise<{
	html: string;
	status: number;
	headers: Record<string, string>;
	usedJsdom: boolean;
}> {
	try {
		// First try with simple fetch
		const simpleResult = await simpleFetch(url, options);

		// Detect if the content needs JavaScript
		const contentType = await detectContentType(simpleResult.html, url);

		// If it doesn't need JavaScript, return the simple result
		if (!contentType.needsJavaScript) {
			return {
				...simpleResult,
				usedJsdom: false,
			};
		}

		// If it needs JavaScript, try with jsdom
		console.log(`Site ${url} appears to need JavaScript, using jsdom...`);
		const jsdomResult = await jsDomFetch(url, options);

		return {
			...jsdomResult,
			usedJsdom: true,
		};
	} catch (error) {
		// If simple fetch fails, try with jsdom as a fallback
		try {
			console.log(`Simple fetch failed for ${url}, falling back to jsdom...`);
			const jsdomResult = await jsDomFetch(url, options);

			return {
				...jsdomResult,
				usedJsdom: true,
			};
		} catch (jsdomError) {
			// If both methods fail, throw the original error
			if (error instanceof Error) {
				throw new Error(`Failed to fetch ${url}: ${error.message}`);
			}
			throw error;
		}
	}
}
