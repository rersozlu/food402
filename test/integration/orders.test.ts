// test/integration/orders.test.ts - Orders API tests
import { describe, it, expect, beforeAll } from "vitest";
import { getTestToken } from "../setup/auth.js";
import { getOrders, getOrderDetail } from "../../shared/api.js";

describe("Orders API", () => {
  let token: string;

  beforeAll(async () => {
    token = await getTestToken();
  });

  describe("getOrders", () => {
    it("should return orders list", async () => {
      const result = await getOrders(token);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("orders");
      expect(Array.isArray(result.orders)).toBe(true);
      expect(result).toHaveProperty("pagination");
    });

    it("should include pagination info", async () => {
      const result = await getOrders(token);

      expect(result.pagination).toBeDefined();
      expect(result.pagination).toHaveProperty("currentPage");
      expect(result.pagination).toHaveProperty("pageSize");
      expect(result.pagination).toHaveProperty("totalCount");
      expect(result.pagination).toHaveProperty("hasNext");
      expect(typeof result.pagination.currentPage).toBe("number");
      expect(typeof result.pagination.hasNext).toBe("boolean");
    });

    it("should include order details if orders exist", async () => {
      const result = await getOrders(token);

      if (result.orders.length > 0) {
        const order = result.orders[0];
        expect(order.id).toBeDefined();
        expect(order.orderDate).toBeDefined();
        expect(order.store).toBeDefined();
        expect(order.store.name).toBeDefined();
        expect(order.status).toBeDefined();
        expect(order.price).toBeDefined();
      }
    });

    it("should include order price information", async () => {
      const result = await getOrders(token);

      if (result.orders.length > 0) {
        const order = result.orders[0];
        expect(order.price).toHaveProperty("totalPrice");
        expect(order.price).toHaveProperty("totalPriceText");
        expect(typeof order.price.totalPrice).toBe("number");
      }
    });

    it("should include order status", async () => {
      const result = await getOrders(token);

      if (result.orders.length > 0) {
        const order = result.orders[0];
        expect(order.status).toHaveProperty("status");
        expect(order.status).toHaveProperty("statusText");
      }
    });

    it("should support pagination parameter", async () => {
      const page1 = await getOrders(token, 1);
      expect(page1.pagination.currentPage).toBe(1);

      // Only test page 2 if there are enough orders
      if (page1.pagination.hasNext) {
        const page2 = await getOrders(token, 2);
        expect(page2.pagination.currentPage).toBe(2);
      }
    });
  });

  describe("getOrderDetail", () => {
    it("should return order detail when order exists", async () => {
      // First get list of orders to find an order ID
      const orders = await getOrders(token);

      if (orders.orders.length === 0) {
        console.warn("No orders found, skipping getOrderDetail test");
        return;
      }

      const orderId = orders.orders[0].id;
      const result = await getOrderDetail(token, orderId);

      expect(result).toBeDefined();
      expect(result.orderId).toBeDefined();
      expect(result.store).toBeDefined();
      expect(result.products).toBeDefined();
      expect(result.price).toBeDefined();
      expect(result.deliveryAddress).toBeDefined();
    });

    it("should include order status steps", async () => {
      const orders = await getOrders(token);

      if (orders.orders.length === 0) {
        console.warn("No orders found, skipping status steps test");
        return;
      }

      const orderId = orders.orders[0].id;
      const result = await getOrderDetail(token, orderId);

      expect(result).toHaveProperty("statusSteps");
      expect(Array.isArray(result.statusSteps)).toBe(true);

      if (result.statusSteps.length > 0) {
        const step = result.statusSteps[0];
        expect(step).toHaveProperty("status");
        expect(step).toHaveProperty("statusText");
      }
    });

    it("should include product details in order", async () => {
      const orders = await getOrders(token);

      if (orders.orders.length === 0) {
        console.warn("No orders found, skipping product details test");
        return;
      }

      const orderId = orders.orders[0].id;
      const result = await getOrderDetail(token, orderId);

      expect(result.products).toBeDefined();
      expect(Array.isArray(result.products)).toBe(true);

      if (result.products.length > 0) {
        const product = result.products[0];
        expect(product.name).toBeDefined();
        expect(product).toHaveProperty("salePrice");
        expect(product).toHaveProperty("quantity");
      }
    });

    it("should include delivery address info", async () => {
      const orders = await getOrders(token);

      if (orders.orders.length === 0) {
        console.warn("No orders found, skipping delivery address test");
        return;
      }

      const orderId = orders.orders[0].id;
      const result = await getOrderDetail(token, orderId);

      expect(result.deliveryAddress).toBeDefined();
      expect(result.deliveryAddress).toHaveProperty("name");
      expect(result.deliveryAddress).toHaveProperty("address");
    });

    it("should include payment description", async () => {
      const orders = await getOrders(token);

      if (orders.orders.length === 0) {
        console.warn("No orders found, skipping payment description test");
        return;
      }

      const orderId = orders.orders[0].id;
      const result = await getOrderDetail(token, orderId);

      expect(result).toHaveProperty("paymentDescription");
    });
  });
});
