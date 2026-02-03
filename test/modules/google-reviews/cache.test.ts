import { describe, it, expect, beforeEach } from "vitest";
import { LRUCache, simpleHash, createCacheKey } from "../../../shared/modules/google-reviews/cache.js";
import type { GetGoogleReviewsRequest } from "../../../shared/modules/google-reviews/types.js";

describe("LRUCache", () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3, 1000); // Max 3 items, 1 second TTL
  });

  describe("basic operations", () => {
    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for missing keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should correctly report size", () => {
      expect(cache.size).toBe(0);
      cache.set("key1", "value1");
      expect(cache.size).toBe(1);
      cache.set("key2", "value2");
      expect(cache.size).toBe(2);
    });

    it("should delete entries", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      cache.delete("key1");
      expect(cache.has("key1")).toBe(false);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      expect(cache.size).toBe(2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe("LRU eviction", () => {
    it("should evict oldest entry when at capacity", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      expect(cache.size).toBe(3);

      // Adding a 4th item should evict the oldest (key1)
      cache.set("key4", "value4");
      expect(cache.size).toBe(3);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should refresh position on access", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Access key1 to refresh its position
      cache.get("key1");

      // Now key2 is the oldest
      cache.set("key4", "value4");
      expect(cache.get("key1")).toBe("value1"); // key1 was refreshed
      expect(cache.get("key2")).toBeUndefined(); // key2 was evicted
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should update position when setting existing key", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Update key1 (should move to end)
      cache.set("key1", "updated1");

      // Now key2 is the oldest
      cache.set("key4", "value4");
      expect(cache.get("key1")).toBe("updated1");
      expect(cache.get("key2")).toBeUndefined(); // evicted
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });
  });

  describe("TTL expiration", () => {
    it("should expire entries after TTL", async () => {
      const shortTtlCache = new LRUCache<string>(10, 50); // 50ms TTL
      shortTtlCache.set("key1", "value1");
      expect(shortTtlCache.get("key1")).toBe("value1");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(shortTtlCache.get("key1")).toBeUndefined();
    });

    it("should remove expired entry on has() check", async () => {
      const shortTtlCache = new LRUCache<string>(10, 50);
      shortTtlCache.set("key1", "value1");
      expect(shortTtlCache.has("key1")).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(shortTtlCache.has("key1")).toBe(false);
    });
  });
});

describe("simpleHash", () => {
  it("should produce consistent hashes", () => {
    const hash1 = simpleHash("McDonald's");
    const hash2 = simpleHash("McDonald's");
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different strings", () => {
    const hash1 = simpleHash("McDonald's");
    const hash2 = simpleHash("Burger King");
    expect(hash1).not.toBe(hash2);
  });

  it("should handle empty strings", () => {
    const hash = simpleHash("");
    expect(hash).toBe("0");
  });

  it("should handle unicode characters", () => {
    const hash1 = simpleHash("Şeref Kebap");
    const hash2 = simpleHash("Seref Kebap");
    expect(hash1).not.toBe(hash2);
  });
});

describe("createCacheKey", () => {
  it("should create consistent keys", () => {
    const request: GetGoogleReviewsRequest = {
      restaurantId: 123,
      restaurantName: "McDonald's",
      neighborhoodName: "Kadıköy",
      tgoDistance: 0.5,
      tgoRating: 4.5,
      latitude: "41.00823456",
      longitude: "28.97842345",
    };

    const key1 = createCacheKey(request);
    const key2 = createCacheKey(request);
    expect(key1).toBe(key2);
  });

  it("should include restaurantId in key", () => {
    const request1: GetGoogleReviewsRequest = {
      restaurantId: 123,
      restaurantName: "Restaurant",
      neighborhoodName: "Area",
      tgoDistance: 0.5,
      tgoRating: 4.5,
      latitude: "41.0082",
      longitude: "28.9784",
    };

    const request2: GetGoogleReviewsRequest = {
      ...request1,
      restaurantId: 456,
    };

    expect(createCacheKey(request1)).not.toBe(createCacheKey(request2));
  });

  it("should include name hash in key", () => {
    const request1: GetGoogleReviewsRequest = {
      restaurantId: 123,
      restaurantName: "McDonald's",
      neighborhoodName: "Area",
      tgoDistance: 0.5,
      tgoRating: 4.5,
      latitude: "41.0082",
      longitude: "28.9784",
    };

    const request2: GetGoogleReviewsRequest = {
      ...request1,
      restaurantName: "Burger King",
    };

    expect(createCacheKey(request1)).not.toBe(createCacheKey(request2));
  });

  it("should round coordinates to 4 decimal places", () => {
    const request1: GetGoogleReviewsRequest = {
      restaurantId: 123,
      restaurantName: "Restaurant",
      neighborhoodName: "Area",
      tgoDistance: 0.5,
      tgoRating: 4.5,
      latitude: "41.00821234",
      longitude: "28.97841234",
    };

    const request2: GetGoogleReviewsRequest = {
      ...request1,
      latitude: "41.00824999", // Rounds to same 41.0082 (toFixed(4) rounds .00824 to .0082)
      longitude: "28.97844999", // Rounds to same 28.9784
    };

    expect(createCacheKey(request1)).toBe(createCacheKey(request2));
  });

  it("should differentiate coordinates that differ in 4th decimal", () => {
    const request1: GetGoogleReviewsRequest = {
      restaurantId: 123,
      restaurantName: "Restaurant",
      neighborhoodName: "Area",
      tgoDistance: 0.5,
      tgoRating: 4.5,
      latitude: "41.0082",
      longitude: "28.9784",
    };

    const request2: GetGoogleReviewsRequest = {
      ...request1,
      latitude: "41.0083", // Different at 4th decimal
    };

    expect(createCacheKey(request1)).not.toBe(createCacheKey(request2));
  });
});
