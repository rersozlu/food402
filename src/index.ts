#!/usr/bin/env node
// src/index.ts - TGO Yemek MCP Server

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getAddresses,
  getRestaurants,
  getRestaurantMenu,
  getProductDetails,
  getProductRecommendations,
  addToBasket,
  getBasket,
  removeFromBasket,
  clearBasket,
  type BasketItem,
} from "./api.js";

const server = new McpServer({
  name: "tgo-yemek",
  version: "1.0.0",
});

// Helper to format successful responses
function formatResponse(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Helper to format error responses
function formatError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

// Tool: get_addresses
server.tool(
  "get_addresses",
  "Get user's saved delivery addresses",
  {},
  async () => {
    try {
      const result = await getAddresses();
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_restaurants
server.tool(
  "get_restaurants",
  "Search restaurants near a location",
  {
    latitude: z.string().describe("Latitude coordinate"),
    longitude: z.string().describe("Longitude coordinate"),
    page: z.number().optional().describe("Page number for pagination (default: 1)"),
  },
  async (args) => {
    try {
      const result = await getRestaurants(args.latitude, args.longitude, args.page ?? 1);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_restaurant_menu
server.tool(
  "get_restaurant_menu",
  "Get a restaurant's full menu with categories and items",
  {
    restaurantId: z.number().describe("Restaurant ID"),
    latitude: z.string().describe("Latitude coordinate"),
    longitude: z.string().describe("Longitude coordinate"),
  },
  async (args) => {
    try {
      const result = await getRestaurantMenu(args.restaurantId, args.latitude, args.longitude);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_product_details
server.tool(
  "get_product_details",
  "Get product customization options (ingredients, modifiers)",
  {
    restaurantId: z.number().describe("Restaurant ID"),
    productId: z.number().describe("Product ID"),
    latitude: z.string().describe("Latitude coordinate"),
    longitude: z.string().describe("Longitude coordinate"),
  },
  async (args) => {
    try {
      const result = await getProductDetails(
        args.restaurantId,
        args.productId,
        args.latitude,
        args.longitude
      );
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_product_recommendations
server.tool(
  "get_product_recommendations",
  "Get 'goes well with' suggestions for products",
  {
    restaurantId: z.number().describe("Restaurant ID"),
    productIds: z.array(z.number()).describe("Array of product IDs to get recommendations for"),
  },
  async (args) => {
    try {
      const result = await getProductRecommendations(args.restaurantId, args.productIds);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Simplified schemas for add_to_basket (avoiding recursive $ref which breaks some MCP clients)
const ModifierProductSchema = z.object({
  productId: z.number().describe("Selected option's product ID"),
  modifierGroupId: z.number().describe("The modifier group this belongs to"),
});

const BasketItemSchema = z.object({
  productId: z.number().describe("Product ID to add"),
  quantity: z.number().describe("Quantity to add"),
  modifierProducts: z.array(ModifierProductSchema).optional().describe("Selected modifiers (optional)"),
  excludeIngredientIds: z.array(z.number()).optional().describe("IDs of ingredients to exclude (optional)"),
});

// Tool: add_to_basket
server.tool(
  "add_to_basket",
  "Add items to the shopping cart",
  {
    storeId: z.number().describe("Restaurant ID"),
    items: z.array(BasketItemSchema).describe("Items to add to basket"),
    latitude: z.number().describe("Latitude coordinate (number)"),
    longitude: z.number().describe("Longitude coordinate (number)"),
    isFlashSale: z.boolean().optional().describe("Enable flash sale discounts (default: false)"),
    storePickup: z.boolean().optional().describe("false = delivery, true = pickup (default: false)"),
  },
  async (args) => {
    try {
      // Transform simplified schema to full API format
      const items: BasketItem[] = args.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        modifierProducts: (item.modifierProducts || []).map((mod) => ({
          productId: mod.productId,
          modifierGroupId: mod.modifierGroupId,
          modifierProducts: [],
          ingredientOptions: { excludes: [], includes: [] as [] },
        })),
        ingredientOptions: {
          excludes: (item.excludeIngredientIds || []).map((id) => ({ id })),
          includes: [] as [],
        },
      }));

      const result = await addToBasket({
        storeId: args.storeId,
        items,
        latitude: args.latitude,
        longitude: args.longitude,
        isFlashSale: args.isFlashSale ?? false,
        storePickup: args.storePickup ?? false,
      });
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_basket
server.tool("get_basket", "Get current cart contents", {}, async () => {
  try {
    const result = await getBasket();
    return formatResponse(result);
  } catch (error) {
    return formatError(error);
  }
});

// Tool: remove_from_basket
server.tool(
  "remove_from_basket",
  "Remove an item from the cart",
  {
    itemId: z.string().describe("Item UUID from the cart (from get_basket response)"),
  },
  async (args) => {
    try {
      const result = await removeFromBasket(args.itemId);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: clear_basket
server.tool("clear_basket", "Clear the entire cart", {}, async () => {
  try {
    await clearBasket();
    return formatResponse({ success: true, message: "Basket cleared successfully" });
  } catch (error) {
    return formatError(error);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
