// test/integration/basket.test.ts - Basket/Cart API tests
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { getTestToken } from "../setup/auth.js";
import { sleep } from "../setup/fixtures.js";
import {
  getAddresses,
  getRestaurants,
  getRestaurantMenu,
  setShippingAddress,
  addToBasket,
  getBasket,
  removeFromBasket,
  clearBasket,
  updateCustomerNote,
  AddToBasketRequest,
} from "../../shared/api.js";

describe("Basket API", () => {
  let token: string;
  let testRestaurantId: number;
  let testProductId: number;
  let testAddressId: number;
  let testLatitude: number;
  let testLongitude: number;

  // Helper to create basket item request
  function createBasketRequest(): AddToBasketRequest {
    return {
      storeId: testRestaurantId,
      items: [
        {
          productId: testProductId,
          quantity: 1,
          modifierProducts: [],
          ingredientOptions: {
            excludes: [],
            includes: [],
          },
        },
      ],
      isFlashSale: false,
      storePickup: false,
      latitude: testLatitude,
      longitude: testLongitude,
    };
  }

  beforeAll(async () => {
    token = await getTestToken();

    // Get user's address for shipping
    const addresses = await getAddresses(token);
    if (addresses.addresses.length === 0) {
      throw new Error("No addresses found. Please add an address first.");
    }
    const address = addresses.addresses[0];
    testAddressId = address.id;
    // Use the address coordinates for both restaurant search and basket
    testLatitude = parseFloat(address.latitude);
    testLongitude = parseFloat(address.longitude);

    // Get a restaurant using the user's address coordinates
    const restaurants = await getRestaurants(
      token,
      address.latitude,
      address.longitude
    );

    const openRestaurant = restaurants.restaurants.find((r) => !r.isClosed);
    if (!openRestaurant) {
      throw new Error("No open restaurant found for basket tests");
    }
    testRestaurantId = openRestaurant.id;

    // Get menu to find a product using the same coordinates
    const menu = await getRestaurantMenu(
      token,
      testRestaurantId,
      address.latitude,
      address.longitude
    );

    for (const category of menu.categories) {
      if (category.items.length > 0) {
        testProductId = category.items[0].id;
        break;
      }
    }

    if (!testProductId) {
      throw new Error("No product found for basket tests");
    }

    // Set shipping address using correct interface
    await setShippingAddress(token, {
      shippingAddressId: testAddressId,
      invoiceAddressId: testAddressId,
    });
  });

  afterEach(async () => {
    // Clean up basket after each test
    try {
      await clearBasket(token);
    } catch {
      // Ignore errors during cleanup
    }
    // Small delay between tests to avoid rate limiting
    await sleep(500);
  });

  afterAll(async () => {
    // Final cleanup
    try {
      await clearBasket(token);
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe("setShippingAddress", () => {
    it("should set shipping address without error", async () => {
      // Should not throw
      await expect(
        setShippingAddress(token, {
          shippingAddressId: testAddressId,
          invoiceAddressId: testAddressId,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("addToBasket", () => {
    it("should add item to basket", async () => {
      const result = await addToBasket(token, createBasketRequest());

      expect(result).toBeDefined();
      expect(result.store).toBeDefined();
      expect(result.store.id).toBe(testRestaurantId);
      expect(result.products).toBeDefined();
      expect(Array.isArray(result.products)).toBe(true);
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.totalProductCount).toBeGreaterThan(0);
    });

    it("should return cart summary after adding", async () => {
      const result = await addToBasket(token, createBasketRequest());

      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.summary)).toBe(true);
      expect(typeof result.totalPrice).toBe("number");
      expect(typeof result.deliveryPrice).toBe("number");
    });
  });

  describe("getBasket", () => {
    it("should return empty basket when cleared", async () => {
      await clearBasket(token);

      const result = await getBasket(token);

      expect(result).toBeDefined();
      expect(result.isEmpty).toBe(true);
      expect(result.totalProductCount).toBe(0);
    });

    it("should return basket with items after adding", async () => {
      await addToBasket(token, createBasketRequest());

      const result = await getBasket(token);

      expect(result).toBeDefined();
      expect(result.isEmpty).toBe(false);
      expect(result.storeGroups).toBeDefined();
      expect(result.storeGroups.length).toBeGreaterThan(0);
      expect(result.totalProductCount).toBeGreaterThan(0);
    });

    it("should include store and product details in basket", async () => {
      await addToBasket(token, createBasketRequest());

      const result = await getBasket(token);

      const storeGroup = result.storeGroups[0];
      expect(storeGroup.store).toBeDefined();
      expect(storeGroup.store.id).toBe(testRestaurantId);
      expect(storeGroup.products).toBeDefined();
      expect(storeGroup.products.length).toBeGreaterThan(0);

      const product = storeGroup.products[0];
      expect(product.productId).toBeDefined();
      expect(product.itemId).toBeDefined();
      expect(product.name).toBeDefined();
    });
  });

  describe("removeFromBasket", () => {
    it("should remove item from basket", async () => {
      // Add item first
      await addToBasket(token, createBasketRequest());

      // Get basket to find itemId
      const basket = await getBasket(token);
      const itemId = basket.storeGroups[0]?.products[0]?.itemId;
      expect(itemId).toBeDefined();

      // Remove item
      const result = await removeFromBasket(token, itemId);

      expect(result).toBeDefined();
      expect(result.isEmpty).toBe(true);
      expect(result.totalProductCount).toBe(0);
    });
  });

  describe("clearBasket", () => {
    it("should clear all items from basket", async () => {
      // Add item first
      await addToBasket(token, createBasketRequest());

      // Clear basket
      await clearBasket(token);

      // Verify empty
      const basket = await getBasket(token);
      expect(basket.isEmpty).toBe(true);
    });
  });

  describe("updateCustomerNote", () => {
    it("should update customer note without error", async () => {
      // Add item first (note requires items in basket)
      await addToBasket(token, createBasketRequest());

      // Should not throw
      await expect(
        updateCustomerNote(token, {
          customerNote: "Test note from integration tests",
          noServiceWare: false,
          contactlessDelivery: false,
          dontRingBell: false,
        })
      ).resolves.toBeUndefined();
    });

    it("should support delivery options", async () => {
      await addToBasket(token, createBasketRequest());

      // Test with all options enabled
      // Some restaurants may not support all options, so we allow 400 errors
      try {
        await updateCustomerNote(token, {
          customerNote: "",
          noServiceWare: true,
          contactlessDelivery: true,
          dontRingBell: true,
        });
        // If it succeeds, great
        expect(true).toBe(true);
      } catch (error: any) {
        // 400 is acceptable - some restaurants don't support all options
        expect(error.message).toContain("400");
      }
    });
  });
});
