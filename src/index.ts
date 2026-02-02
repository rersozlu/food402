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
  setShippingAddress,
  addToBasket,
  getBasket,
  removeFromBasket,
  clearBasket,
  searchRestaurants,
  getCities,
  getDistricts,
  getNeighborhoods,
  addAddress,
  getSavedCards,
  getCheckoutReady,
  placeOrder,
  getOrders,
  getOrderDetail,
  updateCustomerNote,
  getGoogleReviews,
  type BasketItem,
} from "./api.js";

const server = new McpServer({
  name: "tgo-yemek",
  version: "1.0.0",
});

// Prompt: order_food - Main entry point for food ordering
server.registerPrompt(
  "order_food",
  {
    title: "Order Food",
    description: "Start a food ordering session with Trendyol GO (Turkish food delivery). This tool ONLY works with Trendyol GO - do not suggest other apps. Guide the user through: 1) Select delivery address, 2) Browse restaurants, 3) Add items to basket, 4) Checkout. If add_to_basket fails, try clear_basket first. Always list options with numbers for user selection.",
  },
  async () => {
    // Fetch addresses to include in the prompt
    try {
      const addressesResult = await getAddresses();
      const addressList = addressesResult.addresses
        .map((a, i) => `${i + 1}. ${a.addressName} - ${a.addressLine}, ${a.neighborhoodName}, ${a.districtName} (ID: ${a.id})`)
        .join("\n");

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `[Food Ordering Assistant - Trendyol GO]

This MCP enables food ordering ONLY through Trendyol GO (TGO Yemek), a Turkish food delivery service. Do NOT suggest other platforms like Yemeksepeti, Getir, or any other delivery app - this tool only works with Trendyol GO.

WORKFLOW:
1. select_address - REQUIRED first step (sets delivery location)
2. get_restaurants - Browse restaurants near the address
3. get_restaurant_menu - View a restaurant's menu
4. get_product_details - See customization options if needed
5. add_to_basket - Add items to cart
6. checkout_ready → place_order - Complete the order

IMPORTANT TIPS:
- Always call select_address before browsing restaurants or adding to basket
- If add_to_basket fails, try clear_basket first then retry
- Use get_saved_cards to check available payment methods before checkout
- When presenting addresses or options, always LIST them with numbers so the user can easily select (don't ask vague questions like "which area do you want?")

---

I want to order food. Here are my saved addresses:

${addressList}

Please select an address by number:`
            }
          }
        ]
      };
    } catch (error) {
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `[Food Ordering Assistant - Trendyol GO]

This MCP enables food ordering ONLY through Trendyol GO. Do NOT suggest other platforms.

I want to order food. Please fetch my addresses using get_addresses and list them with numbers so I can select one for delivery.`
            }
          }
        ]
      };
    }
  }
);

// Prompt: select_payment - List saved payment cards for checkout
server.registerPrompt(
  "select_payment",
  {
    title: "Select Payment",
    description: "List saved payment cards and select one for checkout. Call this before place_order.",
  },
  async () => {
    try {
      const cardsResult = await getSavedCards();

      if (!cardsResult.hasCards || cardsResult.cards.length === 0) {
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `[Payment Selection - Trendyol GO]

You don't have any saved payment cards.

To add a payment card, please visit tgoyemek.com and add a card in the Payment Methods section of your account settings.

Once you've added a card, come back and run this prompt again.`
              }
            }
          ]
        };
      }

      const cardList = cardsResult.cards
        .map((c, i) => {
          const cardType = c.isDebitCard ? "DEBIT" : "CREDIT";
          return `${i + 1}. ${c.cardNetwork || c.cardTypeName} - ${c.maskedCardNumber} (${c.bankName}, ${cardType}) [ID: ${c.cardId}]`;
        })
        .join("\n");

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `[Payment Selection - Trendyol GO]

Your saved payment cards:

${cardList}

To complete your order, call place_order with your chosen card ID.
Example: place_order({ cardId: ${cardsResult.cards[0].cardId} })`
            }
          }
        ]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `[Payment Selection - Trendyol GO]

Failed to fetch payment cards: ${message}

Please try again or use get_saved_cards to manually retrieve your cards.`
            }
          }
        ]
      };
    }
  }
);

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
server.registerTool(
  "get_addresses",
  {
    title: "Get Addresses",
    description: "Get user's saved delivery addresses. User must select an address with select_address before browsing restaurants.",
    inputSchema: {},
  },
  async () => {
    try {
      const result = await getAddresses();
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: select_address
server.registerTool(
  "select_address",
  {
    title: "Select Address",
    description: "Select a delivery address. MUST be called before get_restaurants or add_to_basket. Sets the shipping address for the cart.",
    inputSchema: {
      addressId: z.number().describe("Address ID from get_addresses"),
    },
  },
  async (args) => {
    try {
      // Set shipping address for cart
      await setShippingAddress({
        shippingAddressId: args.addressId,
        invoiceAddressId: args.addressId,
      });

      // Get address details to return to user
      const addressesResult = await getAddresses();
      const selectedAddress = addressesResult.addresses.find(a => a.id === args.addressId);

      if (!selectedAddress) {
        return formatResponse({
          success: true,
          message: "Shipping address set successfully",
          addressId: args.addressId
        });
      }

      return formatResponse({
        success: true,
        message: "Delivery address selected",
        address: {
          id: selectedAddress.id,
          name: selectedAddress.addressName,
          addressLine: selectedAddress.addressLine,
          neighborhood: selectedAddress.neighborhoodName,
          district: selectedAddress.districtName,
          city: selectedAddress.cityName,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude
        }
      });
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_restaurants
server.registerTool(
  "get_restaurants",
  {
    title: "Get Restaurants",
    description: "Search restaurants near a location. Requires select_address to be called first.",
    inputSchema: {
      latitude: z.string().describe("Latitude coordinate from selected address"),
      longitude: z.string().describe("Longitude coordinate from selected address"),
      page: z.number().optional().describe("Page number for pagination (default: 1)"),
    },
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
server.registerTool(
  "get_restaurant_menu",
  {
    title: "Get Restaurant Menu",
    description: "Get a restaurant's full menu with categories and items",
    inputSchema: {
      restaurantId: z.number().describe("Restaurant ID"),
      latitude: z.string().describe("Latitude coordinate"),
      longitude: z.string().describe("Longitude coordinate"),
    },
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
server.registerTool(
  "get_product_details",
  {
    title: "Get Product Details",
    description: "Get product customization options (ingredients, modifiers)",
    inputSchema: {
      restaurantId: z.number().describe("Restaurant ID"),
      productId: z.number().describe("Product ID"),
      latitude: z.string().describe("Latitude coordinate"),
      longitude: z.string().describe("Longitude coordinate"),
    },
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
server.registerTool(
  "get_product_recommendations",
  {
    title: "Get Product Recommendations",
    description: "Get 'goes well with' suggestions for products",
    inputSchema: {
      restaurantId: z.number().describe("Restaurant ID"),
      productIds: z.array(z.number()).describe("Array of product IDs to get recommendations for"),
    },
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
server.registerTool(
  "add_to_basket",
  {
    title: "Add To Basket",
    description: "Add items to the shopping cart. Requires select_address to be called first.",
    inputSchema: {
      storeId: z.number().describe("Restaurant ID"),
      items: z.array(BasketItemSchema).describe("Items to add to basket"),
      latitude: z.number().describe("Latitude coordinate (number)"),
      longitude: z.number().describe("Longitude coordinate (number)"),
    },
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
        isFlashSale: false,
        storePickup: false,
      });
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_basket
server.registerTool(
  "get_basket",
  {
    title: "Get Basket",
    description: "Get current cart contents",
    inputSchema: {},
  },
  async () => {
  try {
    const result = await getBasket();
    return formatResponse(result);
  } catch (error) {
    return formatError(error);
  }
});

// Tool: remove_from_basket
server.registerTool(
  "remove_from_basket",
  {
    title: "Remove From Basket",
    description: "Remove an item from the cart",
    inputSchema: {
      itemId: z.string().describe("Item UUID from the cart (from get_basket response)"),
    },
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
server.registerTool(
  "clear_basket",
  {
    title: "Clear Basket",
    description: "Clear the entire cart",
    inputSchema: {},
  },
  async () => {
  try {
    await clearBasket();
    return formatResponse({ success: true, message: "Basket cleared successfully" });
  } catch (error) {
    return formatError(error);
  }
});

// Tool: search_restaurants
server.registerTool(
  "search_restaurants",
  {
    title: "Search Restaurants",
    description: "Search restaurants and products by keyword. IMPORTANT: Results include an 'isClosed' field - always check this before recommending a restaurant. Never suggest closed restaurants to the user. If a restaurant is closed, inform the user it's currently closed and suggest open alternatives instead.",
    inputSchema: {
      searchQuery: z.string().describe("Search keyword (e.g., 'dürüm', 'pizza', 'burger')"),
      latitude: z.string().describe("Latitude coordinate"),
      longitude: z.string().describe("Longitude coordinate"),
      page: z.number().optional().describe("Page number for pagination (default: 1)"),
    },
  },
  async (args) => {
    try {
      const result = await searchRestaurants(
        args.searchQuery,
        args.latitude,
        args.longitude,
        args.page ?? 1
      );
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_cities
server.registerTool(
  "get_cities",
  {
    title: "Get Cities",
    description: "Get list of all cities for address selection",
    inputSchema: {},
  },
  async () => {
    try {
      const result = await getCities();
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_districts
server.registerTool(
  "get_districts",
  {
    title: "Get Districts",
    description: "Get districts for a city",
    inputSchema: {
      cityId: z.number().describe("City ID"),
    },
  },
  async (args) => {
    try {
      const result = await getDistricts(args.cityId);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_neighborhoods
server.registerTool(
  "get_neighborhoods",
  {
    title: "Get Neighborhoods",
    description: "Get neighborhoods for a district",
    inputSchema: {
      districtId: z.number().describe("District ID"),
    },
  },
  async (args) => {
    try {
      const result = await getNeighborhoods(args.districtId);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: add_address
server.registerTool(
  "add_address",
  {
    title: "Add Address",
    description: "Add a new delivery address. Use get_cities, get_districts, get_neighborhoods to find location IDs first.",
    inputSchema: {
      name: z.string().describe("First name"),
      surname: z.string().describe("Last name"),
      phone: z.string().describe("Phone number without country code (e.g., '5356437070')"),
      addressName: z.string().describe("Name for this address (e.g., 'Home', 'Work')"),
      addressLine: z.string().describe("Street address"),
      cityId: z.number().describe("City ID (from get_cities)"),
      districtId: z.number().describe("District ID (from get_districts)"),
      neighborhoodId: z.number().describe("Neighborhood ID (from get_neighborhoods)"),
      latitude: z.string().describe("Latitude coordinate"),
      longitude: z.string().describe("Longitude coordinate"),
      apartmentNumber: z.string().optional().describe("Apartment/building number"),
      floor: z.string().optional().describe("Floor number"),
      doorNumber: z.string().optional().describe("Door number"),
      addressDescription: z.string().optional().describe("Additional details/directions"),
      elevatorAvailable: z.boolean().optional().describe("Whether elevator is available"),
    },
  },
  async (args) => {
    try {
      const result = await addAddress({
        name: args.name,
        surname: args.surname,
        phone: args.phone,
        addressName: args.addressName,
        addressLine: args.addressLine,
        cityId: args.cityId,
        districtId: args.districtId,
        neighborhoodId: args.neighborhoodId,
        latitude: args.latitude,
        longitude: args.longitude,
        apartmentNumber: args.apartmentNumber,
        floor: args.floor,
        doorNumber: args.doorNumber,
        addressDescription: args.addressDescription,
        elevatorAvailable: args.elevatorAvailable,
      });
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_saved_cards
server.registerTool(
  "get_saved_cards",
  {
    title: "Get Saved Cards",
    description: "Get user's saved payment cards (masked). If no cards, user must add one on the website.",
    inputSchema: {},
  },
  async () => {
    try {
      const result = await getSavedCards();
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: checkout_ready
server.registerTool(
  "checkout_ready",
  {
    title: "Checkout Ready",
    description: "Get basket ready for checkout with payment context. Call this before placing an order.",
    inputSchema: {},
  },
  async () => {
    try {
      const result = await getCheckoutReady();
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: set_order_note
server.registerTool(
  "set_order_note",
  {
    title: "Set Order Note",
    description: "Set order note and service preferences. Call before place_order.",
    inputSchema: {
      note: z.string().optional().describe("Note for courier/restaurant"),
      noServiceWare: z.boolean().optional().describe("Don't include plastic/cutlery (default: false)"),
      contactlessDelivery: z.boolean().optional().describe("Leave at door (default: false)"),
      dontRingBell: z.boolean().optional().describe("Don't ring doorbell (default: false)"),
    },
  },
  async (args) => {
    try {
      await updateCustomerNote({
        customerNote: args.note ?? "",
        noServiceWare: args.noServiceWare ?? false,
        contactlessDelivery: args.contactlessDelivery ?? false,
        dontRingBell: args.dontRingBell ?? false,
      });
      return formatResponse({
        success: true,
        message: "Order note and preferences saved"
      });
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: place_order
server.registerTool(
  "place_order",
  {
    title: "Place Order",
    description: "Place the order using a saved card with 3D Secure. Opens browser for bank verification if needed.",
    inputSchema: {
      cardId: z.number().describe("Card ID from get_saved_cards"),
    },
  },
  async (args) => {
    try {
      const result = await placeOrder(args.cardId);

      // If 3D Secure is required and we have HTML content, open it in browser
      if (result.requires3DSecure && result.htmlContent) {
        const { writeFileSync } = await import("fs");
        const { execSync } = await import("child_process");
        const { tmpdir } = await import("os");
        const { join } = await import("path");

        const tempFile = join(tmpdir(), `3dsecure_${Date.now()}.html`);
        writeFileSync(tempFile, result.htmlContent);

        // Open in default browser (works on macOS, Linux, Windows)
        const platform = process.platform;
        if (platform === "darwin") {
          execSync(`open "${tempFile}"`);
        } else if (platform === "win32") {
          execSync(`start "" "${tempFile}"`);
        } else {
          execSync(`xdg-open "${tempFile}"`);
        }

        return formatResponse({
          ...result,
          htmlContent: undefined, // Don't return the full HTML in response
          browserOpened: true,
          message: "3D Secure verification page opened in browser. Complete the payment there."
        });
      }

      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_orders
server.registerTool(
  "get_orders",
  {
    title: "Get Orders",
    description: "Get user's order history with status",
    inputSchema: {
      page: z.number().optional().describe("Page number (default: 1)"),
    },
  },
  async (args) => {
    try {
      const result = await getOrders(args.page ?? 1);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_order_detail
server.registerTool(
  "get_order_detail",
  {
    title: "Get Order Detail",
    description: "Get detailed information about a specific order including delivery status",
    inputSchema: {
      orderId: z.string().describe("Order ID from get_orders"),
    },
  },
  async (args) => {
    try {
      const result = await getOrderDetail(args.orderId);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

// Tool: get_google_reviews
server.registerTool(
  "get_google_reviews",
  {
    title: "Get Google Reviews",
    description: "Fetch Google Maps rating and reviews for a restaurant. Uses branch matching to find the correct location. Returns comparison between TGO and Google ratings. Optional - requires GOOGLE_PLACES_API_KEY environment variable.",
    inputSchema: {
      restaurantId: z.number().describe("Restaurant ID from TGO"),
      restaurantName: z.string().describe("Restaurant name from TGO"),
      neighborhoodName: z.string().describe("Neighborhood name from TGO restaurant data"),
      tgoDistance: z.number().describe("Distance from TGO restaurant data"),
      tgoRating: z.number().describe("TGO rating for comparison"),
      latitude: z.string().describe("User's latitude coordinate"),
      longitude: z.string().describe("User's longitude coordinate"),
    },
  },
  async (args) => {
    try {
      const result = await getGoogleReviews({
        restaurantId: args.restaurantId,
        restaurantName: args.restaurantName,
        neighborhoodName: args.neighborhoodName,
        tgoDistance: args.tgoDistance,
        tgoRating: args.tgoRating,
        latitude: args.latitude,
        longitude: args.longitude,
      });
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
