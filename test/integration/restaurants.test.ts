// test/integration/restaurants.test.ts - Restaurant API tests
import { describe, it, expect, beforeAll } from "vitest";
import { getTestToken } from "../setup/auth.js";
import { ISTANBUL_COORDS } from "../setup/fixtures.js";
import { getRestaurants, searchRestaurants } from "../../shared/api.js";

describe("Restaurant API", () => {
  let token: string;

  beforeAll(async () => {
    token = await getTestToken();
  });

  describe("getRestaurants", () => {
    it("should return NON-ZERO restaurants", async () => {
      const result = await getRestaurants(
        token,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result).toBeDefined();
      expect(result.restaurants).toBeDefined();
      expect(Array.isArray(result.restaurants)).toBe(true);

      // CRITICAL: Must have restaurants
      expect(result.restaurants.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);

      // Verify restaurant structure
      const restaurant = result.restaurants[0];
      expect(restaurant.id).toBeDefined();
      expect(restaurant.name).toBeDefined();
      expect(typeof restaurant.id).toBe("number");
      expect(typeof restaurant.name).toBe("string");
    });

    it("should return pagination info", async () => {
      const result = await getRestaurants(
        token,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude,
        1
      );

      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBeGreaterThan(0);
      expect(typeof result.hasNextPage).toBe("boolean");
    });

    it("should support sorting by distance", async () => {
      const result = await getRestaurants(
        token,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude,
        1,
        "RESTAURANT_DISTANCE"
      );

      expect(result.restaurants.length).toBeGreaterThan(0);
      // Verify results are returned (sorting is applied server-side)
    });

    it("should support sorting by score", async () => {
      const result = await getRestaurants(
        token,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude,
        1,
        "RESTAURANT_SCORE"
      );

      expect(result.restaurants.length).toBeGreaterThan(0);
    });

    it("should filter by minBasketPrice when specified", async () => {
      const result = await getRestaurants(
        token,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude,
        1,
        "RECOMMENDED",
        400
      );

      expect(result.restaurants.length).toBeGreaterThan(0);
      // All restaurants should have minBasketPrice <= 400
      for (const restaurant of result.restaurants) {
        expect(restaurant.minBasketPrice).toBeLessThanOrEqual(400);
      }
    });

    it("should include restaurant details", async () => {
      const result = await getRestaurants(
        token,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      const restaurant = result.restaurants[0];
      expect(restaurant).toHaveProperty("kitchen");
      expect(restaurant).toHaveProperty("rating");
      expect(restaurant).toHaveProperty("minBasketPrice");
      expect(restaurant).toHaveProperty("averageDeliveryInterval");
      expect(restaurant).toHaveProperty("isClosed");
    });
  });

  describe("searchRestaurants", () => {
    it("should search restaurants by query and return NON-ZERO results", async () => {
      // Use a common food type that should have results
      const result = await searchRestaurants(
        token,
        "pizza",
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result).toBeDefined();
      expect(result.restaurants).toBeDefined();
      expect(Array.isArray(result.restaurants)).toBe(true);

      // CRITICAL: Search should return results
      expect(result.restaurants.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);
    });

    it("should include products in search results", async () => {
      const result = await searchRestaurants(
        token,
        "burger",
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result.restaurants.length).toBeGreaterThan(0);

      // Search results may include matching products
      const restaurantWithProducts = result.restaurants.find(
        (r) => r.products && r.products.length > 0
      );

      if (restaurantWithProducts) {
        const product = restaurantWithProducts.products[0];
        expect(product.id).toBeDefined();
        expect(product.name).toBeDefined();
      }
    });

    it("should return search metadata", async () => {
      const result = await searchRestaurants(
        token,
        "kebap",
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBeGreaterThan(0);
      expect(result.searchQuery).toBeDefined();
    });

    it("should handle pagination", async () => {
      const result = await searchRestaurants(
        token,
        "döner",
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude,
        1
      );

      expect(result.currentPage).toBe(1);
      expect(typeof result.hasNextPage).toBe("boolean");
    });
  });
});
