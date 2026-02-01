// remote/src/server.ts - MCP server setup with tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env, UserSession } from "./session/types.js";
import { getTGOToken } from "./auth/tgo-auth.js";
import { store3DSPage } from "./payment/3ds-handler.js";
import { SessionStore } from "./session/store.js";

// Import shared API functions
import * as api from "../../shared/api.js";

export interface ServerContext {
  session: UserSession;
  env: Env;
  baseUrl: string;
}

export function createMcpServer(context: ServerContext): McpServer {
  const server = new McpServer({
    name: "tgo-yemek",
    version: "1.0.0",
  });

  // Helper to get token for the current session
  async function getToken(): Promise<string> {
    return getTGOToken(context.session, context.env);
  }

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
    "Get user's saved delivery addresses. User must select an address with select_address before browsing restaurants.",
    {},
    async () => {
      try {
        const token = await getToken();
        const result = await api.getAddresses(token);
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: select_address
  server.tool(
    "select_address",
    "Select a delivery address. MUST be called before get_restaurants or add_to_basket. Sets the shipping address for the cart.",
    {
      addressId: z.number().describe("Address ID from get_addresses"),
    },
    async (args) => {
      try {
        const token = await getToken();
        const store = new SessionStore(context.env);

        // Set shipping address for cart
        await api.setShippingAddress(token, {
          shippingAddressId: args.addressId,
          invoiceAddressId: args.addressId,
        });

        // Get address details to return to user and store in session
        const addressesResult = await api.getAddresses(token);
        const selectedAddress = addressesResult.addresses.find((a) => a.id === args.addressId);

        if (selectedAddress) {
          // Update session with selected address
          context.session.selectedAddressId = selectedAddress.id;
          context.session.selectedLatitude = selectedAddress.latitude;
          context.session.selectedLongitude = selectedAddress.longitude;
          await store.updateSession(context.session);
        }

        if (!selectedAddress) {
          return formatResponse({
            success: true,
            message: "Shipping address set successfully",
            addressId: args.addressId,
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
            longitude: selectedAddress.longitude,
          },
        });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: get_restaurants
  server.tool(
    "get_restaurants",
    "Search restaurants near a location. Requires select_address to be called first.",
    {
      latitude: z.string().describe("Latitude coordinate from selected address"),
      longitude: z.string().describe("Longitude coordinate from selected address"),
      page: z.number().optional().describe("Page number for pagination (default: 1)"),
    },
    async (args) => {
      try {
        const token = await getToken();
        const result = await api.getRestaurants(
          token,
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
        const token = await getToken();
        const result = await api.getRestaurantMenu(
          token,
          args.restaurantId,
          args.latitude,
          args.longitude
        );
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
        const token = await getToken();
        const result = await api.getProductDetails(
          token,
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
        const token = await getToken();
        const result = await api.getProductRecommendations(
          token,
          args.restaurantId,
          args.productIds
        );
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Simplified schemas for add_to_basket
  const ModifierProductSchema = z.object({
    productId: z.number().describe("Selected option's product ID"),
    modifierGroupId: z.number().describe("The modifier group this belongs to"),
  });

  const BasketItemSchema = z.object({
    productId: z.number().describe("Product ID to add"),
    quantity: z.number().describe("Quantity to add"),
    modifierProducts: z
      .array(ModifierProductSchema)
      .optional()
      .describe("Selected modifiers (optional)"),
    excludeIngredientIds: z
      .array(z.number())
      .optional()
      .describe("IDs of ingredients to exclude (optional)"),
  });

  // Tool: add_to_basket
  server.tool(
    "add_to_basket",
    "Add items to the shopping cart. Requires select_address to be called first.",
    {
      storeId: z.number().describe("Restaurant ID"),
      items: z.array(BasketItemSchema).describe("Items to add to basket"),
      latitude: z.number().describe("Latitude coordinate (number)"),
      longitude: z.number().describe("Longitude coordinate (number)"),
    },
    async (args) => {
      try {
        const token = await getToken();

        // Transform simplified schema to full API format
        const items: api.BasketItem[] = args.items.map((item) => ({
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

        const result = await api.addToBasket(token, {
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
  server.tool("get_basket", "Get current cart contents", {}, async () => {
    try {
      const token = await getToken();
      const result = await api.getBasket(token);
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
        const token = await getToken();
        const result = await api.removeFromBasket(token, args.itemId);
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: clear_basket
  server.tool("clear_basket", "Clear the entire cart", {}, async () => {
    try {
      const token = await getToken();
      await api.clearBasket(token);
      return formatResponse({ success: true, message: "Basket cleared successfully" });
    } catch (error) {
      return formatError(error);
    }
  });

  // Tool: search_restaurants
  server.tool(
    "search_restaurants",
    "Search restaurants and products by keyword",
    {
      searchQuery: z.string().describe("Search keyword (e.g., 'dürüm', 'pizza', 'burger')"),
      latitude: z.string().describe("Latitude coordinate"),
      longitude: z.string().describe("Longitude coordinate"),
      page: z.number().optional().describe("Page number for pagination (default: 1)"),
    },
    async (args) => {
      try {
        const token = await getToken();
        const result = await api.searchRestaurants(
          token,
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
  server.tool("get_cities", "Get list of all cities for address selection", {}, async () => {
    try {
      const token = await getToken();
      const result = await api.getCities(token);
      return formatResponse(result);
    } catch (error) {
      return formatError(error);
    }
  });

  // Tool: get_districts
  server.tool(
    "get_districts",
    "Get districts for a city",
    {
      cityId: z.number().describe("City ID"),
    },
    async (args) => {
      try {
        const token = await getToken();
        const result = await api.getDistricts(token, args.cityId);
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: get_neighborhoods
  server.tool(
    "get_neighborhoods",
    "Get neighborhoods for a district",
    {
      districtId: z.number().describe("District ID"),
    },
    async (args) => {
      try {
        const token = await getToken();
        const result = await api.getNeighborhoods(token, args.districtId);
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: add_address
  server.tool(
    "add_address",
    "Add a new delivery address. Use get_cities, get_districts, get_neighborhoods to find location IDs first.",
    {
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
    async (args) => {
      try {
        const token = await getToken();
        const result = await api.addAddress(token, {
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
  server.tool(
    "get_saved_cards",
    "Get user's saved payment cards (masked). If no cards, user must add one on the website.",
    {},
    async () => {
      try {
        const token = await getToken();
        const result = await api.getSavedCards(token);
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: checkout_ready
  server.tool(
    "checkout_ready",
    "Get basket ready for checkout with payment context. Call this before placing an order.",
    {},
    async () => {
      try {
        const token = await getToken();
        const result = await api.getCheckoutReady(token);
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: set_order_note
  server.tool(
    "set_order_note",
    "Set order note and service preferences. Call before place_order.",
    {
      note: z.string().optional().describe("Note for courier/restaurant"),
      noServiceWare: z
        .boolean()
        .optional()
        .describe("Don't include plastic/cutlery (default: false)"),
      contactlessDelivery: z.boolean().optional().describe("Leave at door (default: false)"),
      dontRingBell: z.boolean().optional().describe("Don't ring doorbell (default: false)"),
    },
    async (args) => {
      try {
        const token = await getToken();
        await api.updateCustomerNote(token, {
          customerNote: args.note ?? "",
          noServiceWare: args.noServiceWare ?? false,
          contactlessDelivery: args.contactlessDelivery ?? false,
          dontRingBell: args.dontRingBell ?? false,
        });
        return formatResponse({
          success: true,
          message: "Order note and preferences saved",
        });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: place_order
  server.tool(
    "place_order",
    "Place the order using a saved card. Returns a URL for 3D Secure verification if needed.",
    {
      cardId: z.number().describe("Card ID from get_saved_cards"),
    },
    async (args) => {
      try {
        const token = await getToken();
        const result = await api.placeOrder(token, args.cardId);

        // If 3D Secure is required and we have HTML content, store it and return URL
        if (result.requires3DSecure && result.htmlContent) {
          const threeDSUrl = await store3DSPage(
            context.session.id,
            result.htmlContent,
            context.env,
            context.baseUrl
          );

          return formatResponse({
            success: false,
            requires3DSecure: true,
            verificationUrl: threeDSUrl,
            message: "3D Secure verification required. Open the URL to complete payment.",
          });
        }

        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: get_orders
  server.tool(
    "get_orders",
    "Get user's order history with status",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
    },
    async (args) => {
      try {
        const token = await getToken();
        const result = await api.getOrders(token, args.page ?? 1);
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Tool: get_order_detail
  server.tool(
    "get_order_detail",
    "Get detailed information about a specific order including delivery status",
    {
      orderId: z.string().describe("Order ID from get_orders"),
    },
    async (args) => {
      try {
        const token = await getToken();
        const result = await api.getOrderDetail(token, args.orderId);
        return formatResponse(result);
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // Prompt: order_food
  server.registerPrompt(
    "order_food",
    {
      description:
        "Start a food ordering session. Always begin by asking user to select a delivery address.",
    },
    async () => {
      try {
        const token = await getToken();
        const addressesResult = await api.getAddresses(token);
        const addressList = addressesResult.addresses
          .map(
            (a, i) =>
              `${i + 1}. ${a.addressName} - ${a.addressLine}, ${a.neighborhoodName}, ${a.districtName} (ID: ${a.id})`
          )
          .join("\n");

        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `I want to order food. Here are my saved addresses:\n\n${addressList}\n\nWhich address should I deliver to?`,
              },
            },
          ],
        };
      } catch {
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: "I want to order food. Please fetch my addresses first using get_addresses and ask me which one to use for delivery.",
              },
            },
          ],
        };
      }
    }
  );

  return server;
}
