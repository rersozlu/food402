// test/integration/menu.test.ts - Menu and Product API tests
import { describe, it, expect, beforeAll } from "vitest";
import { getTestToken } from "../setup/auth.js";
import { ISTANBUL_COORDS } from "../setup/fixtures.js";
import {
  getRestaurants,
  getRestaurantMenu,
  getProductDetails,
  getProductRecommendations,
} from "../../shared/api.js";

describe("Menu API", () => {
  let token: string;
  let testRestaurantId: number;
  let testProductId: number;

  beforeAll(async () => {
    token = await getTestToken();

    // Get a restaurant ID for testing
    const restaurants = await getRestaurants(
      token,
      ISTANBUL_COORDS.latitude,
      ISTANBUL_COORDS.longitude
    );

    // Find an open restaurant
    const openRestaurant = restaurants.restaurants.find((r) => !r.isClosed);
    if (!openRestaurant) {
      throw new Error("No open restaurant found for menu tests");
    }
    testRestaurantId = openRestaurant.id;

    // Get menu to find a product ID
    const menu = await getRestaurantMenu(
      token,
      testRestaurantId,
      ISTANBUL_COORDS.latitude,
      ISTANBUL_COORDS.longitude
    );

    // Find first product
    for (const category of menu.categories) {
      if (category.items.length > 0) {
        testProductId = category.items[0].id;
        break;
      }
    }

    if (!testProductId) {
      throw new Error("No product found for menu tests");
    }
  });

  describe("getRestaurantMenu", () => {
    it("should return restaurant menu with categories", async () => {
      const result = await getRestaurantMenu(
        token,
        testRestaurantId,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result).toBeDefined();
      expect(result.info).toBeDefined();
      expect(result.categories).toBeDefined();
      expect(Array.isArray(result.categories)).toBe(true);
      expect(result.totalItems).toBeGreaterThan(0);
    });

    it("should include restaurant info", async () => {
      const result = await getRestaurantMenu(
        token,
        testRestaurantId,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result.info.id).toBe(testRestaurantId);
      expect(result.info.name).toBeDefined();
      expect(typeof result.info.name).toBe("string");
      expect(result.info).toHaveProperty("status");
      expect(result.info).toHaveProperty("rating");
      expect(result.info).toHaveProperty("minOrderPrice");
    });

    it("should include menu items with required fields", async () => {
      const result = await getRestaurantMenu(
        token,
        testRestaurantId,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result.categories.length).toBeGreaterThan(0);

      const category = result.categories[0];
      expect(category.name).toBeDefined();
      expect(Array.isArray(category.items)).toBe(true);

      if (category.items.length > 0) {
        const item = category.items[0];
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(typeof item.price).toBe("number");
      }
    });
  });

  describe("getProductDetails", () => {
    it("should return product details", async () => {
      const result = await getProductDetails(
        token,
        testRestaurantId,
        testProductId,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result).toBeDefined();
      expect(result.restaurantId).toBe(testRestaurantId);
      expect(result.productId).toBe(testProductId);
      expect(result.productName).toBeDefined();
      expect(typeof result.price).toBe("number");
    });

    it("should include restaurant info in product details", async () => {
      const result = await getProductDetails(
        token,
        testRestaurantId,
        testProductId,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result.restaurantId).toBeDefined();
      expect(result.restaurantName).toBeDefined();
    });

    it("should include product components if any", async () => {
      const result = await getProductDetails(
        token,
        testRestaurantId,
        testProductId,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result).toHaveProperty("components");
      expect(Array.isArray(result.components)).toBe(true);

      // If product has components, verify structure
      if (result.components.length > 0) {
        const component = result.components[0];
        expect(component).toHaveProperty("type");
        expect(component).toHaveProperty("options");
        expect(Array.isArray(component.options)).toBe(true);
      }
    });

    it("should include max quantity info", async () => {
      const result = await getProductDetails(
        token,
        testRestaurantId,
        testProductId,
        ISTANBUL_COORDS.latitude,
        ISTANBUL_COORDS.longitude
      );

      expect(result).toHaveProperty("maxQuantity");
      expect(typeof result.maxQuantity).toBe("number");
      expect(result.maxQuantity).toBeGreaterThan(0);
    });
  });

  describe("getProductRecommendations", () => {
    it("should return product recommendations", async () => {
      const result = await getProductRecommendations(
        token,
        testRestaurantId,
        [testProductId]
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("collections");
      expect(Array.isArray(result.collections)).toBe(true);
      expect(result).toHaveProperty("totalItems");
      expect(typeof result.totalItems).toBe("number");
    });

    it("should return recommendation collections with items", async () => {
      const result = await getProductRecommendations(
        token,
        testRestaurantId,
        [testProductId]
      );

      // Recommendations may or may not be available
      if (result.collections.length > 0) {
        const collection = result.collections[0];
        expect(collection.name).toBeDefined();
        expect(Array.isArray(collection.items)).toBe(true);

        if (collection.items.length > 0) {
          const item = collection.items[0];
          expect(item.id).toBeDefined();
          expect(item.name).toBeDefined();
          expect(typeof item.price).toBe("number");
        }
      }
    });
  });
});
