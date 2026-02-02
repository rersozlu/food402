// shared/api.ts - TGO Yemek API Functions (token-parameterized for multi-user support)

import type {
  Address,
  AddressesResponse,
  Restaurant,
  RestaurantsResponse,
  MenuItem,
  MenuCategory,
  RestaurantInfo,
  RestaurantMenuResponse,
  RecommendedItem,
  RecommendationCollection,
  ProductRecommendationsResponse,
  ProductOption,
  ProductComponent,
  ProductDetailsResponse,
  AddToBasketRequest,
  CartProduct,
  CartStore,
  CartSummaryLine,
  AddToBasketResponse,
  SetShippingAddressRequest,
  CartProductDetails,
  CartStoreGroup,
  GetBasketResponse,
  SearchProduct,
  SearchRestaurant,
  SearchRestaurantsResponse,
  City,
  District,
  Neighborhood,
  CitiesResponse,
  DistrictsResponse,
  NeighborhoodsResponse,
  AddAddressRequest,
  AddAddressResponse,
  SavedCard,
  SavedCardsResponse,
  CheckoutReadyResponse,
  PlaceOrderResponse,
  CustomerNoteRequest,
  OrderStatus,
  OrderStore,
  OrderPrice,
  OrderProductSummary,
  Order,
  OrdersResponse,
  OrderDetailProduct,
  OrderStatusStep,
  OrderDetail,
} from "./types.js";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const API_BASE = "https://api.tgoapis.com";
const PAYMENT_API_BASE = "https://payment.tgoapps.com";

// UUID generator that works in both Node.js and Cloudflare Workers
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to create common headers
function createHeaders(token: string, contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/json, text/plain, */*",
    "Authorization": `Bearer ${token}`,
    "User-Agent": USER_AGENT,
    "Origin": "https://tgoyemek.com",
    "x-correlationid": generateUUID(),
    "pid": generateUUID(),
    "sid": generateUUID(),
  };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

// Helper to create payment headers
function createPaymentHeaders(token: string): Record<string, string> {
  return {
    "accept": "*/*",
    "accept-language": "tr-TR",
    "Authorization": `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "referer": "https://payment.tgoapps.com/v3/tgo/card-fragment?application-id=1&storefront-id=1&culture=tr-TR",
    "app-name": "TrendyolGo",
    "x-applicationid": "1",
    "x-channelid": "4",
    "x-storefrontid": "1",
    "x-features": "OPTIONAL_REBATE;MEAL_CART_ENABLED;MEAL_CARD_TRENDYOL_PROMOTION;PICKUP_FEE_ENABLED;VAS_QUANTITY_ENABLED;",
    "x-supported-payment-options": "MULTINET;SODEXO;EDENRED;ON_DELIVERY;SETCARD",
    "x-session-id": "",  // intentionally empty - required by payment API but value not needed
    "x-personalization-id": "",  // intentionally empty - required by payment API but value not needed
  };
}

export async function getAddresses(token: string): Promise<AddressesResponse> {
  const response = await fetch(`${API_BASE}/web-user-apimemberaddress-santral/addresses`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch addresses: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getRestaurants(
  token: string,
  latitude: string,
  longitude: string,
  page: number = 1
): Promise<RestaurantsResponse> {
  const pageSize = 50;

  const params = new URLSearchParams({
    sortType: "RESTAURANT_SCORE",
    minBasketPrice: "400",
    openRestaurants: "true",
    latitude,
    longitude,
    pageSize: pageSize.toString(),
    page: page.toString(),
  });

  const response = await fetch(
    `${API_BASE}/web-discovery-apidiscovery-santral/restaurants/filters?${params}`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch restaurants: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const restaurants: Restaurant[] = data.restaurants.map((r: any) => ({
    id: r.id,
    name: r.name,
    kitchen: r.kitchen,
    rating: r.rating,
    ratingText: r.ratingText,
    minBasketPrice: r.minBasketPrice,
    averageDeliveryInterval: r.averageDeliveryInterval,
    distance: r.location?.distance ?? 0,
    neighborhoodName: r.location?.neighborhoodName ?? "",
    isClosed: r.isClosed,
    campaignText: r.campaignText,
  }));

  return {
    restaurants,
    totalCount: data.restaurantCount,
    currentPage: page,
    pageSize,
    hasNextPage: !!data.links?.next?.href,
  };
}

export async function getRestaurantMenu(
  token: string,
  restaurantId: number,
  latitude: string,
  longitude: string
): Promise<RestaurantMenuResponse> {
  const params = new URLSearchParams({ latitude, longitude });

  const response = await fetch(
    `${API_BASE}/web-restaurant-apirestaurant-santral/restaurants/${restaurantId}?${params}`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch restaurant menu: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  const restaurant = data.restaurant;

  const info: RestaurantInfo = {
    id: restaurant.info.id,
    name: restaurant.info.name,
    status: restaurant.info.status,
    rating: restaurant.info.score?.overall ?? 0,
    ratingText: restaurant.info.score?.ratingText ?? "",
    workingHours: restaurant.info.workingHours,
    deliveryTime: restaurant.info.deliveryInfo?.eta ?? "",
    minOrderPrice: restaurant.info.deliveryInfo?.minPrice ?? 0,
  };

  let totalItems = 0;
  const categories: MenuCategory[] = restaurant.sections.map((section: any) => {
    const items: MenuItem[] = section.products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      price: product.price?.salePrice ?? 0,
      likePercentage: product.productScore?.likePercentageInfo,
    }));
    totalItems += items.length;

    return {
      name: section.name,
      slug: section.slug,
      items,
    };
  });

  return {
    info,
    categories,
    totalItems,
  };
}

export async function getProductRecommendations(
  token: string,
  restaurantId: number,
  productIds: number[]
): Promise<ProductRecommendationsResponse> {
  const response = await fetch(
    `${API_BASE}/web-discovery-apidiscovery-santral/recommendation/product`,
    {
      method: "POST",
      headers: createHeaders(token, "application/json"),
      body: JSON.stringify({
        restaurantId: restaurantId.toString(),
        productIds: productIds.map((id) => id.toString()),
        page: "PDP",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch product recommendations: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  let totalItems = 0;
  const collections: RecommendationCollection[] = (data.collections || []).map((collection: any) => {
    const items: RecommendedItem[] = (collection.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.sellingPrice ?? 0,
      imageUrl: item.imageUrl ?? "",
    }));
    totalItems += items.length;

    return {
      name: collection.name,
      items,
    };
  });

  return {
    collections,
    totalItems,
  };
}

export async function getProductDetails(
  token: string,
  restaurantId: number,
  productId: number,
  latitude: string,
  longitude: string
): Promise<ProductDetailsResponse> {
  const params = new URLSearchParams({ latitude, longitude });

  const response = await fetch(
    `${API_BASE}/web-restaurant-apirestaurant-santral/restaurants/${restaurantId}/products/${productId}?${params}`,
    {
      method: "POST",
      headers: createHeaders(token, "application/json"),
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch product details: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const components: ProductComponent[] = (data.components || []).map((comp: any) => ({
    type: comp.type,
    title: comp.title,
    description: comp.description,
    modifierGroupId: comp.modifierGroupId,
    options: (comp.options || []).map((opt: any) => ({
      id: opt.optionId,
      name: opt.title,
      price: opt.price?.salePrice ?? 0,
      selected: opt.selected ?? false,
      isPopular: opt.badges?.some((b: any) => b.type === "POPULAR_OPTION") ?? false,
    })),
    isSingleChoice: comp.isSingleChoice ?? false,
    minSelections: comp.min ?? 0,
    maxSelections: comp.max ?? 0,
  }));

  return {
    restaurantId: data.restaurantId,
    restaurantName: data.restaurantName,
    productId: data.productId,
    productName: data.productName,
    description: data.productDescription ?? "",
    imageUrl: data.productImage ?? "",
    price: data.price?.salePrice ?? 0,
    maxQuantity: data.maxQuantity ?? 50,
    components,
  };
}

export async function setShippingAddress(
  token: string,
  request: SetShippingAddressRequest
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/shipping`,
    {
      method: "POST",
      headers: createHeaders(token, "application/json"),
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to set shipping address: ${response.status} ${response.statusText}`);
  }
}

export async function addToBasket(
  token: string,
  request: AddToBasketRequest
): Promise<AddToBasketResponse> {
  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts/items`,
    {
      method: "POST",
      headers: createHeaders(token, "application/json"),
      body: JSON.stringify({
        storeId: request.storeId,
        items: request.items,
        isFlashSale: false,
        storePickup: false,
        latitude: request.latitude,
        longitude: request.longitude,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to add to basket: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const storeData = data.groupedProducts?.[0]?.store;
  const store: CartStore = {
    id: storeData?.id ?? request.storeId,
    name: storeData?.name ?? "",
    imageUrl: storeData?.imageUrl ?? "",
    rating: storeData?.rating ?? 0,
    averageDeliveryInterval: storeData?.averageDeliveryInterval ?? "",
    minAmount: storeData?.minAmount ?? 0,
  };

  const products: CartProduct[] = (data.groupedProducts?.[0]?.products || []).map((p: any) => ({
    productId: p.productId,
    itemId: p.itemId,
    name: p.name,
    quantity: p.quantity,
    salePrice: p.salePrice,
    description: p.description ?? "",
  }));

  const summary: CartSummaryLine[] = (data.summary || []).map((s: any) => ({
    title: s.title,
    amount: s.amount,
    isPromotion: s.isPromotion ?? false,
  }));

  return {
    store,
    products,
    summary,
    totalProductCount: data.totalProductCount ?? 0,
    totalProductPrice: data.totalProductPrice ?? 0,
    totalProductPriceDiscounted: data.totalProductPriceDiscounted ?? 0,
    totalPrice: data.totalPrice ?? 0,
    deliveryPrice: data.deliveryPrice ?? 0,
  };
}

export async function getBasket(token: string): Promise<GetBasketResponse> {
  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get basket: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const storeGroups: CartStoreGroup[] = (data.groupedProducts || []).map((group: any) => ({
    store: {
      id: group.store?.id ?? 0,
      name: group.store?.name ?? "",
      imageUrl: group.store?.imageUrl ?? "",
      rating: group.store?.rating ?? 0,
      averageDeliveryInterval: group.store?.averageDeliveryInterval ?? "",
      minAmount: group.store?.minAmount ?? 0,
    },
    products: (group.products || []).map((p: any) => ({
      productId: p.productId,
      itemId: p.itemId,
      name: p.name,
      quantity: p.quantity,
      salePrice: p.salePrice,
      description: p.description ?? "",
      marketPrice: p.marketPrice ?? 0,
      modifierProducts: (p.modifierProducts || []).map((m: any) => ({
        productId: m.productId,
        modifierGroupId: m.modifierGroupId,
        name: m.name,
        price: m.price,
      })),
      ingredientExcludes: (p.ingredientOption?.excludes || []).map((e: any) => ({
        id: e.id,
        name: e.name,
      })),
    })),
  }));

  const summary: CartSummaryLine[] = (data.summary || []).map((s: any) => ({
    title: s.title,
    amount: s.amount,
    isPromotion: s.isPromotion ?? false,
  }));

  return {
    storeGroups,
    summary,
    totalProductCount: data.totalProductCount ?? 0,
    totalProductPrice: data.totalProductPrice ?? 0,
    totalProductPriceDiscounted: data.totalProductPriceDiscounted ?? 0,
    totalPrice: data.totalPrice ?? 0,
    deliveryPrice: data.deliveryPrice ?? 0,
    isEmpty: (data.totalProductCount ?? 0) === 0,
  };
}

export async function removeFromBasket(token: string, itemId: string): Promise<GetBasketResponse> {
  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts/items/${itemId}`,
    {
      method: "DELETE",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove from basket: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const storeGroups: CartStoreGroup[] = (data.groupedProducts || []).map((group: any) => ({
    store: {
      id: group.store?.id ?? 0,
      name: group.store?.name ?? "",
      imageUrl: group.store?.imageUrl ?? "",
      rating: group.store?.rating ?? 0,
      averageDeliveryInterval: group.store?.averageDeliveryInterval ?? "",
      minAmount: group.store?.minAmount ?? 0,
    },
    products: (group.products || []).map((p: any) => ({
      productId: p.productId,
      itemId: p.itemId,
      name: p.name,
      quantity: p.quantity,
      salePrice: p.salePrice,
      description: p.description ?? "",
      marketPrice: p.marketPrice ?? 0,
      modifierProducts: (p.modifierProducts || []).map((m: any) => ({
        productId: m.productId,
        modifierGroupId: m.modifierGroupId,
        name: m.name,
        price: m.price,
      })),
      ingredientExcludes: (p.ingredientOption?.excludes || []).map((e: any) => ({
        id: e.id,
        name: e.name,
      })),
    })),
  }));

  const summary: CartSummaryLine[] = (data.summary || []).map((s: any) => ({
    title: s.title,
    amount: s.amount,
    isPromotion: s.isPromotion ?? false,
  }));

  return {
    storeGroups,
    summary,
    totalProductCount: data.totalProductCount ?? 0,
    totalProductPrice: data.totalProductPrice ?? 0,
    totalProductPriceDiscounted: data.totalProductPriceDiscounted ?? 0,
    totalPrice: data.totalPrice ?? 0,
    deliveryPrice: data.deliveryPrice ?? 0,
    isEmpty: (data.totalProductCount ?? 0) === 0,
  };
}

export async function clearBasket(token: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts`,
    {
      method: "DELETE",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to clear basket: ${response.status} ${response.statusText}`);
  }
}

export async function getCities(token: string): Promise<CitiesResponse> {
  const response = await fetch(
    `${API_BASE}/web-user-apimemberaddress-santral/cities`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch cities: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const cities: City[] = (data.cities || []).map((c: any) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  return {
    cities,
    count: cities.length,
  };
}

export async function getDistricts(token: string, cityId: number): Promise<DistrictsResponse> {
  const response = await fetch(
    `${API_BASE}/web-user-apimemberaddress-santral/cities/${cityId}/districts`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch districts: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const districts: District[] = (data.districts || []).map((d: any) => ({
    id: d.id,
    name: d.name,
  }));

  return {
    districts,
    count: districts.length,
    cityId,
  };
}

export async function getNeighborhoods(token: string, districtId: number): Promise<NeighborhoodsResponse> {
  const response = await fetch(
    `${API_BASE}/web-user-apimemberaddress-santral/districts/${districtId}/neighborhoods`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch neighborhoods: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const neighborhoods: Neighborhood[] = (data.neighborhoods || []).map((n: any) => ({
    id: n.id,
    name: n.name,
  }));

  return {
    neighborhoods,
    count: neighborhoods.length,
    districtId,
  };
}

export async function addAddress(token: string, request: AddAddressRequest): Promise<AddAddressResponse> {
  const payload = {
    name: request.name,
    surname: request.surname,
    phone: request.phone,
    apartmentNumber: request.apartmentNumber ?? "",
    floor: request.floor ?? "",
    doorNumber: request.doorNumber ?? "",
    addressName: request.addressName,
    addressDescription: request.addressDescription ?? "",
    addressLine: request.addressLine,
    cityId: request.cityId,
    districtId: request.districtId,
    neighborhoodId: request.neighborhoodId,
    latitude: request.latitude,
    longitude: request.longitude,
    countryCode: request.countryCode ?? "TR",
    elevatorAvailable: request.elevatorAvailable ?? false,
  };

  const response = await fetch(`${API_BASE}/web-user-apimemberaddress-santral/addresses`, {
    method: "POST",
    headers: createHeaders(token, "application/json"),
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    return {
      success: false,
      requiresOtp: true,
      message: "OTP verification required. Please add this address through the TGO Yemek website.",
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to add address: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const address: Address = {
    id: data.id,
    name: data.name,
    surname: data.surname,
    phone: data.phone,
    countryPhoneCode: data.countryPhoneCode ?? "+90",
    addressLine: data.addressLine,
    addressName: data.addressName,
    postalCode: data.postalCode ?? "",
    cityId: data.cityId,
    cityName: data.cityName ?? "",
    districtId: data.districtId,
    districtName: data.districtName ?? "",
    neighborhoodId: data.neighborhoodId,
    neighborhoodName: data.neighborhoodName ?? "",
    latitude: data.latitude,
    longitude: data.longitude,
    addressDescription: data.addressDescription ?? "",
    apartmentNumber: data.apartmentNumber ?? "",
    floor: data.floor ?? "",
    doorNumber: data.doorNumber ?? "",
    addressType: data.addressType ?? "HOME",
    elevatorAvailable: data.elevatorAvailable ?? false,
  };

  return {
    success: true,
    address,
    message: "Address added successfully",
  };
}

export async function updateCustomerNote(token: string, request: CustomerNoteRequest): Promise<void> {
  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts/customerNote`,
    {
      method: "PUT",
      headers: createHeaders(token, "application/json"),
      body: JSON.stringify({
        customerNote: request.customerNote,
        noServiceWare: request.noServiceWare,
        contactlessDelivery: request.contactlessDelivery,
        dontRingBell: request.dontRingBell,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update customer note: ${response.status} ${response.statusText}`);
  }
}

export async function getSavedCards(token: string): Promise<SavedCardsResponse> {
  const response = await fetch(`${PAYMENT_API_BASE}/v2/cards/`, {
    method: "GET",
    headers: createPaymentHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch saved cards: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  const cardsData = data.json?.cards || data.cards || [];

  const cards: SavedCard[] = cardsData.map((c: any) => ({
    cardId: c.cardId,
    name: c.name ?? "",
    maskedCardNumber: c.maskedCardNumber ?? "",
    cardTypeName: c.cardTypeName ?? "",
    bankName: c.bankName ?? "",
    isDebitCard: c.isDebitCard ?? false,
    cvvRequired: c.cvvRequired ?? false,
    cardNetwork: c.cardNetwork ?? "",
  }));

  if (cards.length === 0) {
    return {
      cards: [],
      hasCards: false,
      message: "No saved cards. Please add a payment method at tgoyemek.com",
    };
  }

  return {
    cards,
    hasCards: true,
  };
}

export async function getCheckoutReady(token: string): Promise<CheckoutReadyResponse> {
  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts?cartContext=payment&limitPromoMbs=false`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (response.status === 400) {
    return {
      ready: false,
      store: {
        id: 0,
        name: "",
        imageUrl: "",
        rating: 0,
        averageDeliveryInterval: "",
        minAmount: 0,
      },
      products: [],
      summary: [],
      totalPrice: 0,
      deliveryPrice: 0,
      warnings: ["Cart is empty. Add items before checkout."],
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to get checkout ready: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const warnings: string[] = [];
  if (data.warnings) {
    warnings.push(...data.warnings.map((w: any) => w.message || String(w)));
  }

  if ((data.totalProductCount ?? 0) === 0) {
    return {
      ready: false,
      store: {
        id: 0,
        name: "",
        imageUrl: "",
        rating: 0,
        averageDeliveryInterval: "",
        minAmount: 0,
      },
      products: [],
      summary: [],
      totalPrice: 0,
      deliveryPrice: 0,
      warnings: ["Cart is empty. Add items before checkout."],
    };
  }

  const group = data.groupedProducts?.[0];
  const store: CartStore = {
    id: group?.store?.id ?? 0,
    name: group?.store?.name ?? "",
    imageUrl: group?.store?.imageUrl ?? "",
    rating: group?.store?.rating ?? 0,
    averageDeliveryInterval: group?.store?.averageDeliveryInterval ?? "",
    minAmount: group?.store?.minAmount ?? 0,
  };

  const products: CartProductDetails[] = (group?.products || []).map((p: any) => ({
    productId: p.productId,
    itemId: p.itemId,
    name: p.name,
    quantity: p.quantity,
    salePrice: p.salePrice,
    description: p.description ?? "",
    marketPrice: p.marketPrice ?? 0,
    modifierProducts: (p.modifierProducts || []).map((m: any) => ({
      productId: m.productId,
      modifierGroupId: m.modifierGroupId,
      name: m.name,
      price: m.price,
    })),
    ingredientExcludes: (p.ingredientOption?.excludes || []).map((e: any) => ({
      id: e.id,
      name: e.name,
    })),
  }));

  const summary: CartSummaryLine[] = (data.summary || []).map((s: any) => ({
    title: s.title,
    amount: s.amount,
    isPromotion: s.isPromotion ?? false,
  }));

  const minAmount = store.minAmount || 0;
  const totalPrice = data.totalPrice ?? 0;
  if (minAmount > 0 && totalPrice < minAmount) {
    warnings.push(`Minimum order amount is ${minAmount} TL. Current total: ${totalPrice} TL`);
  }

  return {
    ready: warnings.length === 0,
    store,
    products,
    summary,
    totalPrice: data.totalPrice ?? 0,
    deliveryPrice: data.deliveryPrice ?? 0,
    warnings,
  };
}

export async function placeOrder(token: string, cardId: number): Promise<PlaceOrderResponse> {
  // First, get the saved cards to find the bin code for this card
  const cardsResponse = await getSavedCards(token);
  const card = cardsResponse.cards.find((c) => c.cardId === cardId);

  if (!card) {
    return {
      success: false,
      message: `Card with ID ${cardId} not found. Use get_saved_cards to see available cards.`,
    };
  }

  // Extract bin code from masked card number (first 6 digits + **)
  const binCode = card.maskedCardNumber.substring(0, 6) + "**";

  const paymentHeaders = createPaymentHeaders(token);

  // Step 1: Initialize cart state (uses standard API headers for API_BASE)
  const checkoutResponse = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts?cartContext=payment&limitPromoMbs=false`,
    { method: "GET", headers: createHeaders(token) }
  );

  if (!checkoutResponse.ok) {
    return {
      success: false,
      message: `Failed to initialize checkout: ${checkoutResponse.status} ${checkoutResponse.statusText}`,
    };
  }

  // Step 2: Select payment method
  const optionsResponse = await fetch(`${PAYMENT_API_BASE}/v3/payment/options`, {
    method: "POST",
    headers: paymentHeaders,
    body: JSON.stringify({
      paymentType: "payWithCard",
      data: {
        savedCardId: cardId,
        binCode: binCode,
        installmentId: 0,
        reward: null,
        installmentPostponingSelected: false,
      },
    }),
  });

  if (!optionsResponse.ok) {
    return {
      success: false,
      message: `Failed to select payment method: ${optionsResponse.status} ${optionsResponse.statusText}`,
    };
  }

  // Step 3: Place the order with 3D Secure
  const response = await fetch(`${PAYMENT_API_BASE}/v2/payment/pay`, {
    method: "POST",
    headers: paymentHeaders,
    body: JSON.stringify({
      customerSelectedThreeD: false,
      paymentOptions: [
        {
          name: "payWithCard",
          cardNo: "",
          customerSelectedThreeD: false,
        },
      ],
      callbackUrl: "https://tgoyemek.com/odeme",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 400 || response.status === 403) {
      try {
        const errorData = JSON.parse(errorText);
        if (
          errorData.redirectUrl ||
          errorData.requires3DSecure ||
          errorData.threeDSecureUrl ||
          errorData.htmlContent ||
          errorData.json?.content
        ) {
          return {
            success: false,
            requires3DSecure: true,
            redirectUrl: errorData.redirectUrl || errorData.threeDSecureUrl,
            htmlContent: errorData.htmlContent || errorData.json?.content,
            message: "3D Secure verification required. Complete payment in browser.",
          };
        }
      } catch {
        // Not JSON, continue with generic error
      }
    }

    throw new Error(`Failed to place order: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  // Check if 3D Secure HTML content is returned
  if (data.json?.content) {
    const formMatch = data.json.content.match(/action="([^"]+)"/);
    const redirectUrl = formMatch ? formMatch[1] : undefined;

    return {
      success: false,
      requires3DSecure: true,
      redirectUrl,
      htmlContent: data.json.content,
      message: "3D Secure verification required. Complete payment in browser.",
    };
  }

  if (data.requires3DSecure || data.redirectUrl || data.threeDSecureUrl || data.htmlContent) {
    return {
      success: false,
      requires3DSecure: true,
      redirectUrl: data.redirectUrl || data.threeDSecureUrl,
      htmlContent: data.htmlContent,
      message: "3D Secure verification required. Complete payment in browser.",
    };
  }

  return {
    success: true,
    orderId: data.orderId || data.orderNumber || data.id,
    message: "Order placed successfully!",
  };
}

export async function getOrders(token: string, page: number = 1): Promise<OrdersResponse> {
  const pageSize = 50;

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/orders?${params}`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const orders: Order[] = (data.orders || []).map((o: any) => ({
    id: o.id,
    orderDate: o.orderDate ?? "",
    store: {
      id: o.store?.id ?? 0,
      name: o.store?.name ?? "",
    },
    status: {
      status: o.status?.status ?? "",
      statusText: o.status?.statusText ?? "",
      statusColor: o.status?.statusColor ?? "",
    },
    price: {
      totalPrice: o.price?.totalPrice ?? 0,
      totalPriceText: o.price?.totalPriceText ?? "",
      refundedPrice: o.price?.refundedPrice ?? 0,
      cancelledPrice: o.price?.cancelledPrice ?? 0,
      totalDeliveryPrice: o.price?.totalDeliveryPrice ?? 0,
      totalServicePrice: o.price?.totalServicePrice ?? 0,
    },
    productSummary: o.product?.name ?? "",
    products: (o.productList || []).map((p: any) => ({
      productId: p.productId,
      name: p.name,
      imageUrl: p.imageUrl ?? "",
    })),
    isReady: o.isReady ?? false,
  }));

  return {
    orders,
    pagination: {
      currentPage: data.pagination?.currentPage ?? page,
      pageSize: data.pagination?.pageSize ?? pageSize,
      totalCount: data.pagination?.totalCount ?? 0,
      hasNext: data.pagination?.hasNext ?? false,
    },
  };
}

export async function getOrderDetail(token: string, orderId: string): Promise<OrderDetail> {
  const params = new URLSearchParams({
    orderId,
  });

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/orders/detail?${params}`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch order detail: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const shipment = data.shipment;
  const shipmentSummary = shipment?.summary;
  const shipmentItem = shipment?.items?.[0];

  const statusSteps: OrderStatusStep[] = (shipmentItem?.state?.statuses || []).map((s: any) => ({
    status: s.status ?? "",
    statusText: s.statusText ?? "",
  }));

  const products: OrderDetailProduct[] = (shipmentItem?.products || []).map((p: any) => ({
    name: p.name ?? "",
    imageUrl: p.imageUrl ?? "",
    salePrice: p.salePrice ?? 0,
    salePriceText: p.salePriceText ?? "",
    quantity: p.quantity ?? 1,
    description: p.description ?? "",
  }));

  const addr = data.deliveryAddress;
  const summaryPrice = data.summary?.price;

  return {
    orderId: data.summary?.orderId ?? orderId,
    orderNumber: data.summary?.orderNumber ?? "",
    orderDate: data.summary?.orderDate ?? "",
    customerNote: data.summary?.customerNote ?? "",
    store: {
      id: parseInt(shipmentSummary?.store?.id, 10) || 0,
      name: shipmentSummary?.store?.name ?? "",
    },
    eta: shipmentSummary?.eta ?? "",
    deliveredDate: shipmentSummary?.deliveredDate ?? "",
    status: {
      status: shipmentItem?.status?.status ?? "",
      statusText: shipmentItem?.status?.statusText ?? "",
      statusColor: shipmentItem?.status?.statusColor ?? "",
    },
    statusSteps,
    products,
    price: {
      totalPrice: summaryPrice?.totalPrice ?? 0,
      totalPriceText: summaryPrice?.totalPriceText ?? "",
      refundedPrice: summaryPrice?.refundedPrice ?? 0,
      cancelledPrice: summaryPrice?.cancelledPrice ?? 0,
      totalDeliveryPrice: summaryPrice?.totalDeliveryPrice ?? 0,
      totalServicePrice: summaryPrice?.totalServicePrice ?? 0,
    },
    paymentDescription: data.paymentInfo?.paymentDescription ?? "",
    deliveryAddress: {
      name: addr?.name ?? "",
      address: addr?.address ?? "",
      districtCity: addr?.districtCity ?? "",
      phoneNumber: addr?.phoneNumber ?? "",
    },
  };
}

export async function searchRestaurants(
  token: string,
  searchQuery: string,
  latitude: string,
  longitude: string,
  page: number = 1
): Promise<SearchRestaurantsResponse> {
  const pageSize = 50;

  const params = new URLSearchParams({
    searchQuery,
    latitude,
    longitude,
    pageSize: pageSize.toString(),
    page: page.toString(),
  });

  const response = await fetch(
    `${API_BASE}/web-restaurant-apirestaurant-santral/restaurants/in/search?${params}`,
    {
      method: "GET",
      headers: createHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to search restaurants: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  const restaurants: SearchRestaurant[] = (data.restaurants || []).map((r: any) => {
    const isClosed = r.isClosed ?? false;
    return {
      id: r.id,
      name: r.name,
      kitchen: r.kitchen ?? "",
      rating: r.rating ?? 0,
      ratingText: r.ratingText ?? "",
      minBasketPrice: r.minBasketPrice ?? 0,
      averageDeliveryInterval: r.averageDeliveryInterval ?? "",
      distance: r.location?.distance ?? 0,
      neighborhoodName: r.location?.neighborhoodName ?? "",
      isClosed,
      campaignText: r.campaignText,
      products: (r.products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price?.salePrice ?? p.price ?? 0,
        imageUrl: p.imageUrl,
      })),
      ...(isClosed && {
        warning: "This restaurant is currently closed. Do not proceed with ordering from this restaurant.",
      }),
    };
  });

  return {
    restaurants,
    totalCount: data.restaurantCount ?? 0,
    currentPage: page,
    pageSize,
    hasNextPage: !!data.links?.next?.href,
    searchQuery: data.searchQuery ?? searchQuery,
  };
}

// Re-export types for convenience
export * from "./types.js";
