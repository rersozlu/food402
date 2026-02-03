// shared/modules/google-reviews/cache.ts - LRU Cache Implementation

import type { CacheEntry, GetGoogleReviewsRequest, GoogleReviewsResponse } from "./types.js";

const MAX_CACHE_SIZE = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generic LRU (Least Recently Used) cache implementation.
 * Uses Map insertion order for LRU eviction.
 */
export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number = MAX_CACHE_SIZE, ttlMs: number = CACHE_TTL_MS) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Get a value from the cache.
   * Returns undefined if not found or expired.
   * Refreshes position on access (LRU behavior).
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    const now = Date.now();

    // Check if expired
    if (entry.expiresAt <= now) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh position in Map (delete and re-add for LRU)
    this.cache.delete(key);
    entry.accessedAt = now;
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Set a value in the cache.
   * Evicts oldest entries if at capacity.
   */
  set(key: string, data: T): void {
    const now = Date.now();

    // If key already exists, delete it first (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      // Map.keys().next() returns the oldest (first inserted) key
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: now + this.ttlMs,
      accessedAt: now,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Simple hash function for strings.
 * Used to include restaurant name in cache key.
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16);
}

/**
 * Create a cache key for Google Reviews requests.
 * Includes restaurantId, name hash, and rounded coordinates.
 */
export function createCacheKey(request: GetGoogleReviewsRequest): string {
  // Round lat/lng to 4 decimal places (~11m precision)
  const lat = parseFloat(request.latitude).toFixed(4);
  const lng = parseFloat(request.longitude).toFixed(4);
  // Include name hash to differentiate restaurants at same location
  const nameHash = simpleHash(request.restaurantName.toLowerCase());
  return `${request.restaurantId}-${nameHash}-${lat}-${lng}`;
}

// Singleton cache instance for Google Reviews
export const googleReviewsCache = new LRUCache<GoogleReviewsResponse>(MAX_CACHE_SIZE, CACHE_TTL_MS);
