/**
 * Simple cache implementation for the crawler
 */

interface CacheItem<T> {
	value: T;
	expiry: number;
}

/**
 * Creates a new cache with optional expiry time
 */
export function createCache<T>(defaultTtlMs: number = 60 * 60 * 1000) {
	const cache = new Map<string, CacheItem<T>>();

	/**
	 * Sets a value in the cache with optional custom TTL
	 */
	function set(key: string, value: T, ttlMs: number = defaultTtlMs): void {
		const expiry = Date.now() + ttlMs;
		cache.set(key, { value, expiry });
	}

	/**
	 * Gets a value from the cache if it exists and hasn't expired
	 */
	function get(key: string): T | undefined {
		const item = cache.get(key);

		if (!item) {
			return undefined;
		}

		if (Date.now() > item.expiry) {
			cache.delete(key);
			return undefined;
		}

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

		for (const [key, item] of cache.entries()) {
			if (now > item.expiry) {
				cache.delete(key);
			}
		}
	}

	/**
	 * Clears all items from the cache
	 */
	function clear(): void {
		cache.clear();
	}

	/**
	 * Gets the size of the cache
	 */
	function size(): number {
		return cache.size;
	}

	// Automatically clear expired items periodically
	setInterval(clearExpired, 60 * 1000);

	return {
		set,
		get,
		has,
		remove,
		clearExpired,
		clear,
		size,
	};
}
