/**
 * Smart Fetcher Module
 *
 * Handles fetching content with intelligent fallback to jsdom for JavaScript-heavy sites
 */

import * as cheerio from "cheerio";
import { JSDOM, VirtualConsole } from "jsdom";
import type { ContentType, FetchOptions } from "../types";

// Constants for known site types to avoid unnecessary content detection
const KNOWN_STATIC_DOMAINS = new Set([
	"example.com",
	"www.example.com",
	"en.wikipedia.org",
	"developer.mozilla.org",
	"www.iana.org",
	"www.mozilla.org",
	"static.mozilla.com"
]);

const KNOWN_JS_HEAVY_DOMAINS = new Set([
	"bun.sh",
	"angular.io",
	"reactjs.org",
	"vuejs.org",
	"svelte.dev"
]);

/**
 * Fast content type checker using domain knowledge
 * @returns true if we can skip the full content detection
 */
function quickContentTypeCheck(url: string): { skip: boolean; needsJavaScript?: boolean } {
	try {
		const hostname = new URL(url).hostname.toLowerCase();

		if (KNOWN_STATIC_DOMAINS.has(hostname)) {
			return { skip: true, needsJavaScript: false };
		}

		if (KNOWN_JS_HEAVY_DOMAINS.has(hostname)) {
			return { skip: true, needsJavaScript: true };
		}

		return { skip: false };
	} catch {
		return { skip: false };
	}
}

/**
 * Detects if a page is likely to require JavaScript for rendering its content
 */
export function detectContentType(html: string, url: string): ContentType {
	// First do a quick check based on domain knowledge
	const quickCheck = quickContentTypeCheck(url);
	if (quickCheck.skip && quickCheck.needsJavaScript !== undefined) {
		return {
			isStatic: !quickCheck.needsJavaScript,
			needsJavaScript: quickCheck.needsJavaScript,
			format: "text/html",
		};
	}

	// Use cheerio to analyze the DOM rather than string matching
	const $ = cheerio.load(html);

	// Get the page format
	const contentTypeMatch = $('meta[http-equiv="content-type"]').attr("content") ||
		$('meta[name="content-type"]').attr("content");
	const format = contentTypeMatch || "text/html";

	// Content analysis metrics
	const metrics = {
		// Check for actual content in the page
		textLength: $("body").text().trim().length,
		paragraphs: $("p").length,
		headings: $("h1, h2, h3, h4, h5, h6").length,
		contentElements: $("article, section, main, .content, #content").length,
		links: $("a[href]").length,
		images: $("img[src]").length,
		scripts: $("script").length,
		lazyLoadElements: $('[data-src], [data-lazy], [data-lazy-src], [loading="lazy"]').length,
	};

	// The main test: Does the page have enough content to be useful?
	const hasSubstantialContent =
		// Either good amount of text
		metrics.textLength > 500 ||
		// Or good structure with some content
		(
			metrics.paragraphs > 2 &&
			metrics.links > 0 &&
			(metrics.headings > 0 || metrics.contentElements > 0)
		);

	// Look for SPA indicators
	const isLikelySPA =
		// Very small amount of content
		metrics.textLength < 200 &&
		// Few structural elements
		metrics.paragraphs < 2 &&
		metrics.headings < 1 &&
		// Many scripts
		metrics.scripts > 3;

	// Look for lazy loading indicators - these often suggest JS is needed
	const hasLazyContent = metrics.lazyLoadElements > 0;

	// We need JavaScript if: 
	// 1. There's not enough content AND it seems like an SPA, or
	// 2. There are lazy loaded elements which need JS to display
	const needsJavaScript = (!hasSubstantialContent && isLikelySPA) || hasLazyContent;

	if (process.env.DEBUG) {
		console.log(`Content analysis for ${url}:`, {
			metrics,
			hasSubstantialContent,
			isLikelySPA,
			hasLazyContent,
			needsJavaScript
		});
	}

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

// Lazy-load JSDOM on first use
let jsdomClass: typeof JSDOM | null = null;
let virtualConsoleClass: typeof VirtualConsole | null = null;

function lazyLoadJsdom() {
	if (!jsdomClass || !virtualConsoleClass) {
		// JSDOM is already imported at the top level, but we'll ensure we have the classes
		jsdomClass = JSDOM;
		virtualConsoleClass = VirtualConsole;
	}
	return { JSDOM: jsdomClass, VirtualConsole: virtualConsoleClass };
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
		// Lazy load JSDOM classes when needed
		const { JSDOM, VirtualConsole } = lazyLoadJsdom();

		// Create a virtual console to capture errors but not spam the console
		const virtualConsole = new VirtualConsole();
		let jsdomErrors = 0;
		const MAX_JSDOM_ERRORS = 10; // Limit error logging

		virtualConsole.on("error", (error: Error) => {
			if (process.env.DEBUG && jsdomErrors < MAX_JSDOM_ERRORS) {
				console.error("JSDOM error:", error.message);
				jsdomErrors++;

				if (jsdomErrors === MAX_JSDOM_ERRORS) {
					console.error(`Suppressing further JSDOM errors for ${url}`);
				}
			}
		});

		// First do a basic fetch to get initial HTML to load in JSDOM
		// This prevents issues with JSDOM trying to fetch from scratch
		const { html: initialHtml } = await simpleFetch(url, options);

		// Create a new JSDOM instance with the initial HTML
		const jsdom = new JSDOM(initialHtml, {
			url,
			referrer: options.headers?.Referer,
			includeNodeLocations: false, // Disable for performance
			storageQuota: 10000000,
			pretendToBeVisual: true,
			resources: "usable",
			runScripts: "dangerously",
			virtualConsole,
		});

		// Wait longer for JavaScript to execute and populate metadata
		const timeout = options.timeout ?? 30000;
		// Cap at 8 seconds to avoid excessive waiting
		const waitTime = Math.min(timeout * 0.8, 8000);

		let result: string;

		try {
			result = await Promise.race([
				new Promise<string>((resolve) => {
					const onLoad = () => {
						// Give time for dynamic content to load but not too long
						setTimeout(() => {
							try {
								// Get the serialized HTML with dynamic content
								const content = jsdom.serialize();
								resolve(content);
							} catch (err) {
								// If serialization fails, fall back to the initial HTML
								resolve(initialHtml);
							}
						}, waitTime);
					};

					// Add the event listener for page load
					try {
						jsdom.window.addEventListener("load", onLoad);
					} catch (err) {
						// If addEventListener fails, resolve with initial HTML
						setTimeout(() => resolve(initialHtml), 100);
					}

					// If load event doesn't fire, resolve after a delay anyway
					setTimeout(() => {
						try {
							const content = jsdom.serialize();
							resolve(content);
						} catch (err) {
							// If serialization fails, fall back to the initial HTML
							resolve(initialHtml);
						}
					}, timeout - 1000); // Leave 1s buffer for cleanup
				}),

				// Timeout promise
				new Promise<string>((_, reject) => {
					setTimeout(() => {
						reject(new Error(`JSDOM fetch timed out after ${timeout}ms`));
					}, timeout);
				})
			]);
		} catch (error) {
			// If any step of the JSDOM process fails, fall back to the initial HTML
			result = initialHtml;
		}

		// Always make sure to clean up resources
		try {
			jsdom.window.close();
		} catch (error) {
			// Ignore errors during cleanup
		}

		return {
			html: result,
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
	// Add a timeout if not provided
	const fetchOptions = {
		...options,
		timeout: options.timeout ?? 30000,
	};

	// Check if site is in our known categories to skip detection
	const quickCheck = quickContentTypeCheck(url);
	if (quickCheck.skip && quickCheck.needsJavaScript !== undefined) {
		if (!quickCheck.needsJavaScript) {
			// Known static site, use simple fetch
			const result = await simpleFetch(url, fetchOptions);
			return {
				...result,
				usedJsdom: false,
			};
		}

		// Known JS-heavy site, try JSDOM but with fallback
		if (process.env.DEBUG) {
			console.log(`Known JS-heavy site: ${url}, using JSDOM immediately`);
		}

		// Get static content first as fallback
		const staticResult = await simpleFetch(url, fetchOptions);

		try {
			const jsdomResult = await jsDomFetch(url, fetchOptions);

			// Verify JSDOM added significant content
			if (jsdomResult.html.length > staticResult.html.length * 1.1) {
				return {
					...jsdomResult,
					usedJsdom: true,
				};
			}
		} catch (jsdomError) {
			// JSDOM failed, just continue to return the static result
			if (process.env.DEBUG) {
				console.log(`JSDOM failed for known JS-heavy site ${url}: ${jsdomError instanceof Error ? jsdomError.message : String(jsdomError)}`);
			}
		}

		// Either JSDOM didn't add enough or it failed - return static result
		return {
			...staticResult,
			usedJsdom: false,
		};
	}

	// First try with simple fetch to get baseline content
	let simpleResult: {
		html: string;
		status: number;
		headers: Record<string, string>;
	};
	try {
		simpleResult = await simpleFetch(url, fetchOptions);
	} catch (simpleError) {
		console.error(`Simple fetch failed for ${url}: ${simpleError instanceof Error ? simpleError.message : String(simpleError)}`);

		// Try with JSDOM as fallback for simple fetch errors
		try {
			console.log(`Attempting to use JSDOM as fallback for ${url}...`);
			const jsdomResult = await jsDomFetch(url, fetchOptions);
			return {
				...jsdomResult,
				usedJsdom: true,
			};
		} catch (jsdomError) {
			// Both methods failed, throw the original error
			if (simpleError instanceof Error) {
				throw new Error(`Failed to fetch ${url}: ${simpleError.message}`);
			}
			throw simpleError;
		}
	}

	// We've got simpleResult, now check if we need JavaScript
	const contentType = detectContentType(simpleResult.html, url);

	// If it doesn't need JavaScript, return the simple result
	if (!contentType.needsJavaScript) {
		return {
			...simpleResult,
			usedJsdom: false,
		};
	}

	// JavaScript is needed, try JSDOM
	try {
		console.log(`Site ${url} appears to need JavaScript, attempting to use jsdom...`);

		try {
			const jsdomResult = await jsDomFetch(url, fetchOptions);

			// Verify the JSDOM result has more content than the simple fetch
			const simpleContentLength = simpleResult.html.length;
			const jsdomContentLength = jsdomResult.html.length;

			// Only use JSDOM result if it's significantly different
			if (jsdomContentLength > simpleContentLength * 1.1) { // 10% more content
				console.log(`JSDOM successfully enhanced content (${simpleContentLength} → ${jsdomContentLength} bytes)`);
				return {
					...jsdomResult,
					usedJsdom: true,
				};
			}

			console.log("JSDOM didn't significantly enhance content, using simple fetch result");
		} catch (jsdomError) {
			// Handle JSDOM errors gracefully
			const errorMessage = jsdomError instanceof Error ? jsdomError.message : String(jsdomError);

			if (errorMessage.includes("NotYetImplemented")) {
				console.log("JSDOM limitation encountered: NotYetImplemented - this is common for modern web frameworks");
			} else if (errorMessage.includes("null is not an object") ||
				errorMessage.includes("undefined is not an object")) {
				console.log("JSDOM JavaScript execution error - likely due to browser APIs not supported in JSDOM");
			} else {
				console.log(`JSDOM error: ${errorMessage}`);
			}
		}

		// Always fall back to simple fetch result if JSDOM fails or doesn't enhance content
		return {
			...simpleResult,
			usedJsdom: false,
		};
	} catch (error) {
		// If all attempts fail, return simple result as fallback
		console.error(`Error during smart fetch for ${url}: ${error instanceof Error ? error.message : String(error)}`);
		return {
			...simpleResult,
			usedJsdom: false,
		};
	}
}
