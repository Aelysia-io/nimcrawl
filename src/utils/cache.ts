/**
 * Simple cache implementation for the crawler
 */

interface CacheItem<T> {
	value: T;
	expiry: number;
	metadata?: Record<string, unknown>;
}

/**
 * Creates a new cache with optional expiry time
 */
export function createCache<T>(defaultTtlMs: number = 60 * 60 * 1000) {
	const cache = new Map<string, CacheItem<T>>();
	let hits = 0;
	let misses = 0;
	let lastCleanup = Date.now();

	/**
	 * Sets a value in the cache with optional custom TTL
	 */
	function set(key: string, value: T, ttlMs: number = defaultTtlMs, metadata?: Record<string, unknown>): void {
		const expiry = Date.now() + ttlMs;
		cache.set(key, { value, expiry, metadata });
	}

	/**
	 * Gets a value from the cache if it exists and hasn't expired
	 */
	function get(key: string): T | undefined {
		const item = cache.get(key);

		if (!item) {
			misses++;
			return undefined;
		}

		if (Date.now() > item.expiry) {
			cache.delete(key);
			misses++;
			return undefined;
		}

		hits++;
		return item.value;
	}

	/**
	 * Checks if a key exists in the cache and hasn't expired
	 */
	function has(key: string): boolean {
		const item = cache.get(key);

		if (!item) {
			return false;
		}

		if (Date.now() > item.expiry) {
			cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Attempts to get a value from cache, or computes and caches it if missing
	 */
	async function getOrCompute(
		key: string,
		computeFn: () => Promise<T>,
		ttlMs: number = defaultTtlMs
	): Promise<T> {
		const cachedValue = get(key);
		if (cachedValue !== undefined) {
			return cachedValue;
		}

		const computedValue = await computeFn();
		set(key, computedValue, ttlMs);
		return computedValue;
	}

	/**
	 * Removes an item from the cache
	 */
	function remove(key: string): void {
		cache.delete(key);
	}

	/**
	 * Clears all expired items from the cache
	 */
	function clearExpired(): void {
		const now = Date.now();

		// Only clean if it's been at least 30 seconds since last cleanup
		if (now - lastCleanup < 30000) {
			return;
		}

		lastCleanup = now;
		let expiredCount = 0;

		for (const [key, item] of cache.entries()) {
			if (now > item.expiry) {
				cache.delete(key);
				expiredCount++;
			}
		}

		if (process.env.DEBUG && expiredCount > 0) {
			console.log(`Cache cleanup: removed ${expiredCount} expired items`);
		}
	}

	/**
	 * Clears all items from the cache
	 */
	function clear(): void {
		cache.clear();
		hits = 0;
		misses = 0;
	}

	/**
	 * Gets the size of the cache
	 */
	function size(): number {
		return cache.size;
	}

	/**
	 * Gets cache statistics
	 */
	function stats(): { size: number; hits: number; misses: number; hitRate: number } {
		const total = hits + misses;
		const hitRate = total > 0 ? hits / total : 0;
		return { size: cache.size, hits, misses, hitRate };
	}

	// Automatically clear expired items periodically, but less frequently (every 5 minutes)
	const cleanupInterval = 5 * 60 * 1000; // 5 minutes
	setInterval(clearExpired, cleanupInterval);

	return {
		set,
		get,
		has,
		getOrCompute,
		remove,
		clearExpired,
		clear,
		size,
		stats,
	};
}
