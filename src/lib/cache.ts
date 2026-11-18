/**
 * VARENA High-Concurrency In-Memory / Redis Cache Layer
 * Offloads recursive network tree traversal and frequent catalog lookups
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<any>>();

let cacheHits = 0;
let cacheMisses = 0;

/**
 * Get item from cache
 */
export function getFromCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) {
    cacheMisses++;
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    cacheMisses++;
    return null;
  }

  cacheHits++;
  return entry.value as T;
}

/**
 * Set item into cache with TTL in milliseconds (default 5 minutes)
 */
export function setIntoCache<T>(key: string, value: T, ttlMs: number = 300000): void {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidate specific cache keys by prefix
 * e.g. invalidateCacheByPrefix('uplines:') when a placement transfer occurs
 */
export function invalidateCacheByPrefix(prefix: string): number {
  let count = 0;
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Get Cache Performance Metrics
 */
export function getCacheMetrics() {
  const total = cacheHits + cacheMisses;
  const hitRatio = total > 0 ? ((cacheHits / total) * 100).toFixed(1) + '%' : '0%';
  return {
    itemsCount: cacheStore.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRatio,
  };
}
