import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Generate perseus client/session ID
function generatePerseusId(): string {
  const timestamp = Date.now();
  const random1 = Math.random().toString().slice(2);
  const random2 = Math.random().toString(36).slice(2);
  return `${timestamp}.${random1}.${random2}`;
}

// Generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate DPS session ID
function generateDpsSessionId(perseusId: string): string {
  const sessionData = {
    session_id: generateUUID().replace(/-/g, ''),
    perseus_id: perseusId,
    timestamp: Math.floor(Date.now() / 1000)
  };
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

const YEMEKSEPETI_API_BASE = "https://tr.fd-api.com/api/v5";
const YEMEKSEPETI_GRAPHQL_URL = "https://tr.fd-api.com/graphql";

// Customer ID - Replace with your own customer ID
const CUSTOMER_ID = "trw2r0yj";

const server = new McpServer({
  name: "yemeksepeti",
  version: "1.0.0",
});

server.tool(
  "get_customer_addresses",
  "Fetches the list of saved addresses for the authenticated Yemeksepeti customer",
  {},
  async () => {
    const token = process.env.YEMEKSEPETI_TOKEN;

    if (!token) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: YEMEKSEPETI_TOKEN environment variable is not set",
          },
        ],
      };
    }

    try {
      const response = await fetch(`${YEMEKSEPETI_API_BASE}/customers/addresses`, {
        method: "GET",
        headers: {
          Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
          "X-Fp-Api-Key": "volo",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching addresses: ${response.status} ${response.statusText}\n${errorText}`,
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "list_restaurants",
  "Lists restaurants available for delivery at a given location with pagination support",
  {
    latitude: z.number().describe("Delivery location latitude"),
    longitude: z.number().describe("Delivery location longitude"),
    pagination_token: z.string().optional().describe("Pagination token from previous response for next page"),
  },
  async ({ latitude, longitude, pagination_token }) => {
    const token = process.env.YEMEKSEPETI_TOKEN;

    if (!token) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: YEMEKSEPETI_TOKEN environment variable is not set",
          },
        ],
      };
    }

    const requestBody = {
      extensions: {
        persistedQuery: {
          sha256Hash: "71df256e1a0d7a7df73b0b60a69b9e2a19c2fdc8e17b6e9543dcd64101271cbf",
          version: 1,
        },
      },
      variables: {
        input: {
          expeditionType: "DELIVERY",
          latitude,
          longitude,
          locale: "tr_TR",
          customerType: "B2C",
          languageId: 2,
          page: "RESTAURANT_LANDING_PAGE",
          featureFlags: [
            { name: "dynamic-pricing-indicator", value: "Original" },
            { name: "saver-delivery-upper-funnel", value: "Control" },
            { name: "pd-mp-homescreen-full-federation-listing", value: "Control" },
            { name: "vdp_citadel-tech-integration", value: "Control" },
            { name: "pd-mp-slp-replatform-federated", value: "Control" },
          ],
          vendorFilters: {
            budgets: [],
            cuisineIds: [],
            foodCharacteristicIds: [],
            paymentTypes: [],
            deliveryProviders: [],
            discountLabels: [],
            sort: "DISTANCE_ASC",
            hasDiscount: false,
            hasFreeDelivery: false,
            hasOnlinePayment: false,
            hasVoucher: false,
            isSuperVendor: false,
            verticalTypesIds: [],
          },
          availabilityFilters: {},
          ...(pagination_token ? { tokenPagination: { token: pagination_token } } : {}),
        },
      },
    };

    try {
      const perseusClientId = generatePerseusId();
      const perseusSessionId = generatePerseusId();

      const response = await fetch(YEMEKSEPETI_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Authorization": token.startsWith("Bearer ") ? token : `Bearer ${token}`,
          "X-Fp-Api-Key": "volo",
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
          "apollographql-client-name": "web",
          "apollographql-client-version": "VENDOR-LIST-MICROFRONTEND.26.04.0006",
          "app-version": "VENDOR-LIST-MICROFRONTEND.26.04.0006",
          "platform": "web",
          "locale": "tr_TR",
          "origin": "https://www.yemeksepeti.com",
          "referer": "https://www.yemeksepeti.com/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "customer-latitude": String(latitude),
          "customer-longitude": String(longitude),
          "display-context": "rlp",
          "dps-session-id": generateDpsSessionId(perseusClientId),
          "perseus-client-id": perseusClientId,
          "perseus-session-id": perseusSessionId,
          "request-id": generateUUID(),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching restaurants: ${response.status} ${response.statusText}\n${errorText}`,
            },
          ],
        };
      }

      const data = await response.json();

      // Extract restaurant data from the response
      const components = data?.data?.vendorListingPage?.components || [];
      const restaurants: Array<{
        name: string;
        code: string;
        urlKey: string;
        status: string;
        distanceInMeters: number | null;
        rating: { value: number | null; count: number | null };
        budget: number | null;
        deliveryTime: { min: number | null; max: number | null } | null;
        deliveryFee: number | null;
        minimumOrderValue: number | null;
        isSuperVendor: boolean;
      }> = [];

      for (const component of components) {
        const vendorData = component?.vendorData;
        if (vendorData) {
          restaurants.push({
            name: vendorData.name,
            code: vendorData.code,
            urlKey: vendorData.urlKey,
            status: vendorData.availability?.status || "UNKNOWN",
            distanceInMeters: vendorData.availability?.distanceInMeters ?? null,
            rating: {
              value: vendorData.vendorRating?.value ?? null,
              count: vendorData.vendorRating?.count ?? null,
            },
            budget: vendorData.vendorBudget?.budget ?? null,
            deliveryTime: vendorData.timeEstimations?.delivery?.duration
              ? {
                  min: vendorData.timeEstimations.delivery.duration.min ?? null,
                  max: vendorData.timeEstimations.delivery.duration.max ?? null,
                }
              : null,
            deliveryFee: vendorData.dynamicPricing?.deliveryFee?.total ?? null,
            minimumOrderValue: vendorData.dynamicPricing?.minimumOrderValue?.total ?? null,
            isSuperVendor: vendorData.isSuperVendor ?? false,
          });
        }
      }

      // Extract metadata
      const totalVendors = data?.data?.vendorListingPage?.totalVendors ?? null;
      const nextToken = data?.data?.vendorListingPage?.tokenPagination?.token ?? null;

      const result = {
        totalVendors,
        restaurants,
        pagination: {
          nextToken,
          hasMore: !!nextToken,
        },
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "search_restaurants",
  "Searches restaurants by name at a given location. Returns only open restaurants.",
  {
    query: z.string().describe("Search query (restaurant name)"),
    latitude: z.number().describe("Delivery location latitude"),
    longitude: z.number().describe("Delivery location longitude"),
    pagination_token: z.string().optional().describe("Token from previous response for pagination"),
  },
  async ({ query, latitude, longitude, pagination_token }) => {
    const token = process.env.YEMEKSEPETI_TOKEN;

    if (!token) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: YEMEKSEPETI_TOKEN environment variable is not set",
          },
        ],
      };
    }

    const requestBody = {
      extensions: {
        persistedQuery: {
          sha256Hash: "0bf5c7e6077c83ea75eba9de6b8aae43daac4b6106bd4ddf8794a4d03ebb2525",
          version: 1,
        },
      },
      variables: {
        searchResultsParams: {
          query,
          latitude,
          longitude,
          locale: "tr_TR",
          languageId: 2,
          expeditionType: "DELIVERY",
          customerType: "B2C",
          verticalTypes: ["RESTAURANTS"],
        },
        skipQueryCorrection: true,
        ...(pagination_token ? { tokenPagination: { token: pagination_token } } : {}),
      },
    };

    try {
      const perseusClientId = generatePerseusId();
      const perseusSessionId = generatePerseusId();

      const response = await fetch(YEMEKSEPETI_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Authorization": token.startsWith("Bearer ") ? token : `Bearer ${token}`,
          "X-Fp-Api-Key": "volo",
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
          "apollographql-client-name": "web",
          "apollographql-client-version": "VENDOR-LIST-MICROFRONTEND.26.04.0006",
          "app-version": "VENDOR-LIST-MICROFRONTEND.26.04.0006",
          "platform": "web",
          "locale": "tr_TR",
          "origin": "https://www.yemeksepeti.com",
          "referer": "https://www.yemeksepeti.com/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "customer-code": CUSTOMER_ID,
          "customer-latitude": String(latitude),
          "customer-longitude": String(longitude),
          "display-context": "SEARCH",
          "dps-session-id": generateDpsSessionId(perseusClientId),
          "perseus-client-id": perseusClientId,
          "perseus-session-id": perseusSessionId,
          "request-id": generateUUID(),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching restaurants: ${response.status} ${response.statusText}\n${errorText}`,
            },
          ],
        };
      }

      const data = await response.json();

      // Extract restaurant data from the response
      const components = data?.data?.components || [];
      const allRestaurants: Array<{
        name: string;
        code: string;
        urlKey: string;
        status: string;
        distanceInMeters: number | null;
        rating: { value: number | null; count: number | null };
        budget: number | null;
        deliveryTime: { min: number | null; max: number | null } | null;
        deliveryFee: number | null;
        minimumOrderValue: number | null;
        isSuperVendor: boolean;
      }> = [];

      for (const component of components) {
        const vendorData = component?.vendorData;
        if (vendorData) {
          const status = vendorData.availability?.status || "UNKNOWN";
          allRestaurants.push({
            name: vendorData.name,
            code: vendorData.code,
            urlKey: vendorData.urlKey,
            status,
            distanceInMeters: vendorData.availability?.distanceInMeters ?? null,
            rating: {
              value: vendorData.vendorRating?.value ?? null,
              count: vendorData.vendorRating?.count ?? null,
            },
            budget: vendorData.vendorBudget?.budget ?? null,
            deliveryTime: vendorData.timeEstimations?.delivery?.duration
              ? {
                  min: vendorData.timeEstimations.delivery.duration.min ?? null,
                  max: vendorData.timeEstimations.delivery.duration.max ?? null,
                }
              : null,
            deliveryFee: vendorData.dynamicPricing?.deliveryFee?.total ?? null,
            minimumOrderValue: vendorData.dynamicPricing?.minimumOrderValue?.total ?? null,
            isSuperVendor: vendorData.isSuperVendor ?? false,
          });
        }
      }

      // Filter to only include open restaurants
      const restaurants = allRestaurants.filter(r => r.status === "OPEN");

      // Extract pagination token
      const nextToken = data?.data?.tokenPagination?.token ?? null;

      const result = {
        query,
        totalResults: restaurants.length,
        restaurants,
        pagination: {
          nextToken,
          hasMore: !!nextToken,
        },
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "get_restaurant_menu",
  "Fetches the menu categories for a specific restaurant. Returns category names with item counts.",
  {
    restaurant_id: z.string().describe("The restaurant/vendor ID (e.g., 'y30u')"),
    latitude: z.number().describe("Customer delivery location latitude"),
    longitude: z.number().describe("Customer delivery location longitude"),
  },
  async ({ restaurant_id, latitude, longitude }) => {
    const token = process.env.YEMEKSEPETI_TOKEN;

    if (!token) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: YEMEKSEPETI_TOKEN environment variable is not set",
          },
        ],
      };
    }

    try {
      const perseusClientId = generatePerseusId();
      const perseusSessionId = generatePerseusId();

      const params = new URLSearchParams({
        include: "menus,bundles,multiple_discounts,payment_types",
        language_id: "2",
        opening_type: "delivery",
        basket_currency: "TRY",
        latitude: String(latitude),
        longitude: String(longitude),
      });

      const response = await fetch(
        `${YEMEKSEPETI_API_BASE}/vendors/${restaurant_id}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
            "X-Fp-Api-Key": "volo",
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "api-version": "7",
            "x-pd-language-id": "2",
            "platform": "web",
            "locale": "tr_TR",
            "origin": "https://www.yemeksepeti.com",
            "referer": "https://www.yemeksepeti.com/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "dps-session-id": generateDpsSessionId(perseusClientId),
            "perseus-client-id": perseusClientId,
            "perseus-session-id": perseusSessionId,
            "request-id": generateUUID(),
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Restaurant not found with ID '${restaurant_id}'`,
              },
            ],
          };
        }
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching restaurant menu: ${response.status} ${response.statusText}\n${errorText}`,
            },
          ],
        };
      }

      const data = await response.json();
      const vendor = data?.data;

      if (!vendor) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Unexpected response format - no vendor data found",
            },
          ],
        };
      }

      // Extract restaurant info
      const firstMenu = vendor.menus?.[0];
      const restaurantInfo = {
        id: vendor.id,
        code: vendor.code,
        name: vendor.name,
        menuId: firstMenu?.id,
        rating: vendor.rating,
        reviewCount: vendor.review_number,
        isOpen: vendor.is_active,
        deliveryTime: vendor.minimum_delivery_time
          ? `${vendor.minimum_delivery_time}-${vendor.maximum_delivery_time} min`
          : null,
        minimumOrderAmount: vendor.minimum_order_amount,
        deliveryFee: vendor.delivery_fee,
      };

      // Extract menu categories from first menu (compact - no items, just counts)
      const menuCategories = (firstMenu?.menu_categories || []).map((category: {
        id: number;
        name: string;
        products?: Array<unknown>;
      }) => ({
        id: category.id,
        name: category.name,
        itemCount: (category.products || []).length,
      }));

      const result = {
        restaurant: restaurantInfo,
        categories: menuCategories,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "get_category_items",
  "Fetches paginated items for a specific category in a restaurant menu",
  {
    vendor_code: z.string().describe("The restaurant/vendor code"),
    category_id: z.string().describe("The category ID from get_restaurant_menu"),
    latitude: z.number().describe("Customer delivery location latitude"),
    longitude: z.number().describe("Customer delivery location longitude"),
    page: z.number().optional().describe("Page number (default: 1)"),
    page_size: z.number().optional().describe("Items per page (default: 10, max: 20)"),
  },
  async ({ vendor_code, category_id, latitude, longitude, page = 1, page_size = 10 }) => {
    const token = process.env.YEMEKSEPETI_TOKEN;

    if (!token) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: YEMEKSEPETI_TOKEN environment variable is not set",
          },
        ],
      };
    }

    // Clamp page_size to max 20
    const effectivePageSize = Math.min(Math.max(1, page_size), 20);
    const effectivePage = Math.max(1, page);

    try {
      const perseusClientId = generatePerseusId();
      const perseusSessionId = generatePerseusId();

      const params = new URLSearchParams({
        include: "menus,bundles,multiple_discounts,payment_types",
        language_id: "2",
        opening_type: "delivery",
        basket_currency: "TRY",
        latitude: String(latitude),
        longitude: String(longitude),
      });

      const response = await fetch(
        `${YEMEKSEPETI_API_BASE}/vendors/${vendor_code}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
            "X-Fp-Api-Key": "volo",
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "api-version": "7",
            "x-pd-language-id": "2",
            "platform": "web",
            "locale": "tr_TR",
            "origin": "https://www.yemeksepeti.com",
            "referer": "https://www.yemeksepeti.com/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "dps-session-id": generateDpsSessionId(perseusClientId),
            "perseus-client-id": perseusClientId,
            "perseus-session-id": perseusSessionId,
            "request-id": generateUUID(),
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Restaurant not found with code '${vendor_code}'`,
              },
            ],
          };
        }
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching restaurant data: ${response.status} ${response.statusText}\n${errorText}`,
            },
          ],
        };
      }

      const data = await response.json();
      const vendor = data?.data;
      const firstMenu = vendor?.menus?.[0];

      if (!firstMenu) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No menu found for this vendor",
            },
          ],
        };
      }

      // Find the category by ID
      const categoryIdNum = parseInt(category_id, 10);
      const foundCategory = (firstMenu.menu_categories || []).find(
        (cat: { id: number }) => cat.id === categoryIdNum
      );

      if (!foundCategory) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Category with ID '${category_id}' not found`,
            },
          ],
        };
      }

      // Get all products in category
      const allProducts = foundCategory.products || [];
      const totalItems = allProducts.length;
      const totalPages = Math.ceil(totalItems / effectivePageSize);

      // Paginate
      const startIndex = (effectivePage - 1) * effectivePageSize;
      const endIndex = startIndex + effectivePageSize;
      const paginatedProducts = allProducts.slice(startIndex, endIndex);

      // Map products to simplified format
      const items = paginatedProducts.map((product: {
        id: number;
        name: string;
        description?: string;
        is_available?: boolean;
        product_variations?: Array<{ topping_ids?: number[] }>;
      }) => ({
        id: product.id,
        name: product.name,
        description: product.description || "",
        price: (product as { product_variations?: Array<{ price?: number }> }).product_variations?.[0]?.price ?? 0,
        isAvailable: product.is_available ?? true,
        hasOptions: (product.product_variations?.[0]?.topping_ids?.length ?? 0) > 0,
      }));

      const result = {
        category: {
          id: foundCategory.id,
          name: foundCategory.name,
        },
        items,
        pagination: {
          page: effectivePage,
          pageSize: effectivePageSize,
          totalItems,
          totalPages,
          hasMore: effectivePage < totalPages,
        },
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "get_product_details",
  "Fetches complete product details including customization options (toppings/choices). IMPORTANT: After fetching, present each choice group as an interactive question using AskUserQuestion tool - do NOT ask user to type option names. For required options (required=true), user must select.",
  {
    product_id: z.string().describe("The product ID"),
    vendor_code: z.string().describe("The restaurant/vendor code"),
    menu_id: z.string().describe("The menu ID (from get_restaurant_menu)"),
    latitude: z.number().describe("Customer delivery location latitude"),
    longitude: z.number().describe("Customer delivery location longitude"),
  },
  async ({ product_id, vendor_code, menu_id, latitude, longitude }) => {
    const token = process.env.YEMEKSEPETI_TOKEN;

    if (!token) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: YEMEKSEPETI_TOKEN environment variable is not set",
          },
        ],
      };
    }

    try {
      const perseusClientId = generatePerseusId();
      const perseusSessionId = generatePerseusId();

      const response = await fetch("https://tr.fd-api.com/graphql", {
        method: "POST",
        headers: {
          "Authorization": token.startsWith("Bearer ") ? token : `Bearer ${token}`,
          "Content-Type": "application/json;charset=UTF-8",
          "Accept": "application/json, text/plain, */*",
          "apollographql-client-name": "web",
          "apollographql-client-version": "VENDOR-DETAILS-MICROFRONTEND.26.04.0027",
          "customer-latitude": String(latitude),
          "customer-longitude": String(longitude),
          "display-context": "ITEM_MODIFIER",
          "locale": "tr_TR",
          "platform": "web",
          "x-language-id": "2",
          "x-pd-language-id": "2",
          "perseus-client-id": perseusClientId,
          "perseus-session-id": perseusSessionId,
          "origin": "https://www.yemeksepeti.com",
          "referer": "https://www.yemeksepeti.com/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({
          extensions: {
            persistedQuery: {
              sha256Hash: "d80141de7939f2d54cd6dbc598ec14f197c48183dde71b3e1bc65649a77f8954",
              version: 1
            }
          },
          variables: {
            isPreconfiguredToppingsEnabled: false,
            recommendedChoiceGroupsInput: {
              isMealForOne: false,
              expeditionType: "DELIVERY"
            },
            input: {
              productID: product_id,
              vendorCode: vendor_code,
              expeditionType: "DELIVERY",
              menuID: menu_id
            },
            discountedPriceInput: {
              expeditionType: "DELIVERY"
            },
            includeVendor: false
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching product details: ${response.status} ${response.statusText}\n${errorText}`,
            },
          ],
        };
      }

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `GraphQL Error: ${JSON.stringify(data.errors, null, 2)}`,
            },
          ],
        };
      }

      const product = data?.data?.restaurantProduct;

      if (!product) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Product with ID '${product_id}' not found`,
            },
          ],
        };
      }

      const result = {
        id: product.id,
        code: product.code,
        title: product.title,
        description: product.description,
        imageUrl: product.imageUrl,
        vendorCode: product.vendorCode,
        isAlcoholicItem: product.isAlcoholicItem,
        isSoldOut: product.isSoldOut,
        category: {
          id: product.menuCategory?.id,
          title: product.menuCategory?.title,
        },
        variations: product.variations?.map((v: {
          id: string;
          code: string;
          title: string;
          price: number;
          discountedPrice?: number;
          choiceGroups?: Array<{
            id: string;
            title: string;
            choiceGroupType: string;
            choiceSelectionUI: string;
            quantityMinimum: number;
            quantityMaximum: number;
            choices?: Array<{
              id: string;
              choiceProductID: string;
              title: string;
              description?: string;
              price: number;
              discountedPrice?: number;
              isSoldOut: boolean;
              isAlcoholicItem: boolean;
            }>;
          }>;
        }) => ({
          id: v.id,
          code: v.code,
          title: v.title,
          price: v.price,
          discountedPrice: v.discountedPrice,
          choiceGroups: v.choiceGroups?.map(cg => ({
            id: cg.id,
            title: cg.title,
            type: cg.choiceGroupType,
            selectionUI: cg.choiceSelectionUI,
            required: cg.quantityMinimum > 0,
            quantityMinimum: cg.quantityMinimum,
            quantityMaximum: cg.quantityMaximum,
            choices: cg.choices?.map(c => ({
              id: c.id,
              choiceProductID: c.choiceProductID,
              title: c.title,
              description: c.description,
              price: c.price,
              discountedPrice: c.discountedPrice,
              isSoldOut: c.isSoldOut,
              isAlcoholicItem: c.isAlcoholicItem,
            })) || []
          })) || []
        })) || []
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "calculate_cart",
  "Calculates cart total, validates product availability, and returns pricing breakdown including discounts, delivery fees, and minimum order requirements. Call this after user has selected all products and customizations.",
  {
    vendor_code: z.string().describe("The restaurant/vendor code"),
    vendor_latitude: z.number().describe("Restaurant latitude"),
    vendor_longitude: z.number().describe("Restaurant longitude"),
    customer_latitude: z.number().describe("Customer delivery location latitude"),
    customer_longitude: z.number().describe("Customer delivery location longitude"),
    products: z.array(z.object({
      id: z.number().describe("Product ID"),
      variation_id: z.number().describe("Product variation ID"),
      variation_name: z.string().describe("Variation name"),
      quantity: z.number().describe("Quantity to order"),
      price: z.number().describe("Unit price"),
      original_price: z.number().describe("Original price before discount"),
      menu_id: z.number().optional().describe("Menu ID"),
      menu_category_id: z.number().optional().describe("Menu category ID"),
      code: z.string().nullable().optional().describe("Product code (from GraphQL)"),
      variation_code: z.string().nullable().optional().describe("Variation code (from GraphQL)"),
      special_instructions: z.string().optional().describe("Special instructions for this item"),
      sold_out_option: z.enum(["REFUND", "CANCEL"]).optional().describe("What to do if sold out"),
      toppings: z.array(z.object({
        id: z.number().describe("Topping ID"),
        name: z.string().describe("Topping name"),
        price: z.number().describe("Topping price"),
        quantity: z.number().optional().describe("Topping quantity (default 1)")
      })).optional().describe("Selected toppings/customizations")
    })).describe("Products to add to cart")
  },
  async ({ vendor_code, vendor_latitude, vendor_longitude, customer_latitude, customer_longitude, products }) => {
    const token = process.env.YEMEKSEPETI_TOKEN;

    if (!token) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: YEMEKSEPETI_TOKEN environment variable is not set",
          },
        ],
      };
    }

    try {
      const perseusClientId = generatePerseusId();
      const perseusSessionId = generatePerseusId();
      const dpsSessionId = generateDpsSessionId(perseusClientId);

      // Build products array for the payload
      const cartProducts = products.map((p, index) => {
        const toppingsTotal = p.toppings?.reduce((sum, t) => sum + (t.price * (t.quantity || 1)), 0) || 0;
        const itemTotal = (p.price + toppingsTotal) * p.quantity;

        return {
          id: p.id,
          name: p.variation_name,
          variation_id: p.variation_id,
          variation_name: p.variation_name,
          price: p.price,
          original_price: p.original_price,
          quantity: p.quantity,
          menu_id: p.menu_id || null,
          menu_category_id: p.menu_category_id || null,
          code: p.code || null,
          variation_code: p.variation_code || null,
          special_instructions: p.special_instructions || "",
          sold_out_option: p.sold_out_option || "REFUND",
          sort_order: index + 1,
          toppings: p.toppings?.map(t => ({
            id: t.id,
            name: t.name,
            price: t.price,
            quantity: t.quantity || 1
          })) || [],
          item_total: itemTotal
        };
      });

      const payload = {
        products: cartProducts,
        vendor: {
          code: vendor_code,
          latitude: vendor_latitude,
          longitude: vendor_longitude,
          marketplace: true,
          vertical: "restaurants"
        },
        expedition: {
          type: "delivery",
          latitude: customer_latitude,
          longitude: customer_longitude
        },
        supported_features: {
          expedition_fee_breakdown: true,
          dynamic_checkout_services: true,
          sof_mvp_vendor: true,
          estimated_pickup_time: true,
          sof_pricing: true
        },
        payment: {
          methods: [],
          loyalty_points_to_claim: 0
        }
      };

      const response = await fetch(`${YEMEKSEPETI_API_BASE}/cart/calculate?include=expedition`, {
        method: "POST",
        headers: {
          "Authorization": token.startsWith("Bearer ") ? token : `Bearer ${token}`,
          "Content-Type": "application/json;charset=UTF-8",
          "Accept": "application/json, text/plain, */*",
          "locale": "tr_TR",
          "platform": "web",
          "x-language-id": "2",
          "x-pd-language-id": "2",
          "perseus-client-id": perseusClientId,
          "perseus-session-id": perseusSessionId,
          "dps-session-id": dpsSessionId,
          "origin": "https://www.yemeksepeti.com",
          "referer": "https://www.yemeksepeti.com/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Error calculating cart: ${response.status} ${response.statusText}\n${errorText}`,
            },
          ],
        };
      }

      const data = await response.json();

      // Parse the response into a simplified format
      const result = {
        products: data.products?.map((p: {
          id: number;
          name: string;
          variation_id: number;
          quantity: number;
          price: number;
          original_price: number;
          item_total: number;
          is_available?: boolean;
          sold_out?: boolean;
          toppings?: Array<{
            id: number;
            name: string;
            price: number;
            quantity: number;
          }>;
        }) => ({
          id: p.id,
          name: p.name,
          variation_id: p.variation_id,
          quantity: p.quantity,
          unit_price: p.price,
          original_price: p.original_price,
          item_total: p.item_total,
          is_available: p.is_available !== false && !p.sold_out,
          toppings: p.toppings || []
        })) || [],
        payment: {
          subtotal: data.payment?.subtotal || 0,
          discounted_subtotal: data.payment?.discounted_subtotal || data.payment?.subtotal || 0,
          total: data.payment?.total || 0,
          savings: (data.payment?.subtotal || 0) - (data.payment?.discounted_subtotal || data.payment?.subtotal || 0)
        },
        expedition: {
          delivery_fee: data.expedition?.delivery_fee || 0,
          estimated_time: data.expedition?.estimated_delivery_time || data.expedition?.estimated_time || null,
          delivery_fee_breakdown: data.expedition?.delivery_fee_breakdown || null
        },
        minimum_order: {
          amount: data.minimum_order_amount || data.vendor?.minimum_order_amount || 0,
          current_subtotal: data.payment?.subtotal || 0,
          is_met: (data.payment?.subtotal || 0) >= (data.minimum_order_amount || data.vendor?.minimum_order_amount || 0)
        },
        is_valid: data.is_valid !== false && !data.errors?.length,
        errors: data.errors || [],
        warnings: data.warnings || []
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Server started");
}

main().catch(console.error);
