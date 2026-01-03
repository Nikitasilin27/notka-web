/**
 * Simple in-memory cache with TTL (Time To Live)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number; // milliseconds

  constructor(ttl: number = 5 * 60 * 1000) { // Default: 5 minutes
    this.ttl = ttl;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get all keys (useful for debugging)
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }
}

// Singleton caches for different data types
export const userCache = new Cache<any>(10 * 60 * 1000); // 10 minutes
export const trackCache = new Cache<any>(30 * 60 * 1000); // 30 minutes
export const spotifyCache = new Cache<any>(5 * 60 * 1000); // 5 minutes
