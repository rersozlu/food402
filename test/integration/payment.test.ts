// test/integration/payment.test.ts - Payment API tests
// NOTE: placeOrder is intentionally NOT tested to avoid real charges
import { describe, it, expect, beforeAll } from "vitest";
import { getTestToken } from "../setup/auth.js";
import { getSavedCards, getCheckoutReady } from "../../shared/api.js";

describe("Payment API", () => {
  let token: string;

  beforeAll(async () => {
    token = await getTestToken();
  });

  describe("getSavedCards", () => {
    it("should return saved cards response", async () => {
      const result = await getSavedCards(token);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("cards");
      expect(Array.isArray(result.cards)).toBe(true);
      expect(result).toHaveProperty("hasCards");
      expect(typeof result.hasCards).toBe("boolean");
    });

    it("should include card details if cards exist", async () => {
      const result = await getSavedCards(token);

      if (result.hasCards && result.cards.length > 0) {
        const card = result.cards[0];
        expect(card.cardId).toBeDefined();
        expect(card.maskedCardNumber).toBeDefined();
        expect(typeof card.maskedCardNumber).toBe("string");
        // Masked card number should have asterisks
        expect(card.maskedCardNumber).toMatch(/\*/);
      }
    });

    it("should return message when no cards", async () => {
      const result = await getSavedCards(token);

      if (!result.hasCards) {
        expect(result.message).toBeDefined();
        expect(result.message).toContain("No saved cards");
      }
    });
  });

  describe("getCheckoutReady", () => {
    it("should return checkout ready status", async () => {
      const result = await getCheckoutReady(token);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("ready");
      expect(typeof result.ready).toBe("boolean");
      expect(result).toHaveProperty("store");
      expect(result).toHaveProperty("products");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("warnings");
    });

    it("should indicate empty cart when no items", async () => {
      const result = await getCheckoutReady(token);

      // If cart is empty, ready should be false with warning
      if (!result.ready && result.products.length === 0) {
        expect(result.warnings).toBeDefined();
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it("should return price information", async () => {
      const result = await getCheckoutReady(token);

      expect(result).toHaveProperty("totalPrice");
      expect(result).toHaveProperty("deliveryPrice");
      expect(typeof result.totalPrice).toBe("number");
      expect(typeof result.deliveryPrice).toBe("number");
    });

    it("should return summary lines", async () => {
      const result = await getCheckoutReady(token);

      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.summary)).toBe(true);

      // If there are summary lines, verify structure
      if (result.summary.length > 0) {
        const summaryLine = result.summary[0];
        expect(summaryLine).toHaveProperty("title");
        expect(summaryLine).toHaveProperty("amount");
      }
    });
  });

  // placeOrder is intentionally NOT tested to avoid placing real orders
  describe("placeOrder", () => {
    it.skip("SKIPPED: placeOrder not tested to avoid real charges", () => {
      // This test is intentionally skipped.
      // placeOrder would charge the user's card and create a real order.
      // To test this function:
      // 1. Use a test environment/sandbox if available
      // 2. Or manually test with user consent
    });
  });
});
