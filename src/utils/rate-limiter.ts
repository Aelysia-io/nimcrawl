/**
 * Rate limiter implementation
 *
 * Provides domain-specific rate limiting with configurable rules
 */

interface RateLimitRule {
	tokensPerInterval: number;
	interval: number; // in milliseconds
	tokensLeft: number;
	lastRefill: number;
}

interface RateLimiterOptions {
	/**
	 * Default rule for any domain not explicitly configured
	 */
	defaultRule?: {
		tokensPerInterval: number;
		interval: number; // in milliseconds
	};

	/**
	 * Domain-specific rules
	 */
	domainRules?: Record<
		string,
		{
			tokensPerInterval: number;
			interval: number; // in milliseconds
		}
	>;
}

/**
 * Creates a rate limiter with token bucket algorithm
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
	const defaultRule = options.defaultRule ?? {
		tokensPerInterval: 5,
		interval: 1000, // 5 requests per second
	};

	const rules = new Map<string, RateLimitRule>();

	// Initialize domain rules from options
	if (options.domainRules) {
		for (const [domain, rule] of Object.entries(options.domainRules)) {
			rules.set(domain, {
				...rule,
				tokensLeft: rule.tokensPerInterval,
				lastRefill: Date.now(),
			});
		}
	}

	/**
	 * Gets the hostname from a URL
	 */
	function getHostname(url: string): string {
		try {
			return new URL(url).hostname;
		} catch (error) {
			return url;
		}
	}

	/**
	 * Gets or creates a rule for a domain
	 */
	function getRuleForDomain(domain: string): RateLimitRule {
		let rule = rules.get(domain);

		if (!rule) {
			rule = {
				...defaultRule,
				tokensLeft: defaultRule.tokensPerInterval,
				lastRefill: Date.now(),
			};
			rules.set(domain, rule);
		}

		return rule;
	}

	/**
	 * Refills tokens for a rule based on elapsed time
	 */
	function refillTokens(rule: RateLimitRule): void {
		const now = Date.now();
		const elapsed = now - rule.lastRefill;

		if (elapsed >= rule.interval) {
			// Calculate how many full intervals have passed
			const intervals = Math.floor(elapsed / rule.interval);

			// Add tokens for each interval
			rule.tokensLeft = Math.min(
				rule.tokensPerInterval,
				rule.tokensLeft + intervals * rule.tokensPerInterval,
			);

			// Update last refill time, accounting for unused partial intervals
			rule.lastRefill = now - (elapsed % rule.interval);
		}
	}

	/**
	 * Acquires a token for a URL, or waits until one is available
	 */
	async function acquire(url: string): Promise<void> {
		const domain = getHostname(url);
		const rule = getRuleForDomain(domain);

		// Try to refill tokens before checking
		refillTokens(rule);

		// If we have tokens available, consume one and return
		if (rule.tokensLeft > 0) {
			rule.tokensLeft--;
			return;
		}

		// Otherwise, calculate how long to wait
		const timeToWait = rule.interval - (Date.now() - rule.lastRefill);

		// Wait for the next token to become available
		await new Promise((resolve) => setTimeout(resolve, timeToWait));

		// Retry after waiting
		return acquire(url);
	}

	/**
	 * Creates a wrapper for a function that respects rate limits
	 */
	function wrap<Args extends unknown[], Return>(
		fn: (...args: Args) => Promise<Return>,
		urlExtractor: (args: Args) => string,
	): (...args: Args) => Promise<Return> {
		return async (...args: Args): Promise<Return> => {
			const url = urlExtractor(args);
			await acquire(url);
			return fn(...args);
		};
	}

	/**
	 * Updates a rule for a specific domain
	 */
	function updateRule(
		domain: string,
		rule: {
			tokensPerInterval: number;
			interval: number;
		},
	): void {
		const existingRule = rules.get(domain);

		rules.set(domain, {
			...rule,
			tokensLeft: existingRule?.tokensLeft ?? rule.tokensPerInterval,
			lastRefill: existingRule?.lastRefill ?? Date.now(),
		});
	}

	/**
	 * Gets the current state of all rules
	 */
	function getRules(): Record<
		string,
		{
			tokensPerInterval: number;
			interval: number;
			tokensLeft: number;
			lastRefill: number;
		}
	> {
		const result: Record<string, RateLimitRule> = {};

		for (const [domain, rule] of rules.entries()) {
			result[domain] = { ...rule };
		}

		return result;
	}

	return {
		acquire,
		wrap,
		updateRule,
		getRules,
	};
}
