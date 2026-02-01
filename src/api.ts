// src/api.ts - TGO Yemek API Functions

import { getToken } from "./auth.js";
import { randomUUID } from "crypto";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const API_BASE = "https://api.tgoapis.com";
const PAYMENT_API_BASE = "https://payment.tgoapps.com";

export interface Address {
  id: number;
  name: string;
  surname: string;
  phone: string;
  countryPhoneCode: string;
  addressLine: string;
  addressName: string;
  postalCode: string;
  cityId: number;
  cityName: string;
  districtId: number;
  districtName: string;
  neighborhoodId: number;
  neighborhoodName: string;
  latitude: string;
  longitude: string;
  addressDescription: string;
  apartmentNumber: string;
  floor: string;
  doorNumber: string;
  addressType: string;
  elevatorAvailable: boolean;
}

export interface AddressesResponse {
  infoMessage: string | null;
  id: string;
  addresses: Address[];
}

export interface Restaurant {
  id: number;
  name: string;
  kitchen: string;  // cuisine types
  rating: number;
  ratingText: string;  // e.g. "(800+)"
  minBasketPrice: number;
  averageDeliveryInterval: string;  // e.g. "30-40dk"
  distance: number;  // in km
  neighborhoodName: string;
  isClosed: boolean;
  campaignText?: string;  // promotions
}

export interface RestaurantsResponse {
  restaurants: Restaurant[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
}

export async function getAddresses(): Promise<AddressesResponse> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}/web-user-apimemberaddress-santral/addresses`, {
    method: "GET",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Authorization": `Bearer ${token}`,
      "User-Agent": USER_AGENT,
      "Origin": "https://tgoyemek.com",
      "x-correlationid": randomUUID(),
      "pid": randomUUID(),
      "sid": randomUUID()
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch addresses: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  likePercentage?: string;  // e.g. "85%"
}

export interface MenuCategory {
  name: string;
  slug: string;
  items: MenuItem[];
}

export interface RestaurantInfo {
  id: number;
  name: string;
  status: string;  // "OPEN" or "CLOSED"
  rating: number;
  ratingText: string;
  workingHours: string;
  deliveryTime: string;  // e.g. "30-40dk"
  minOrderPrice: number;
}

export interface RestaurantMenuResponse {
  info: RestaurantInfo;
  categories: MenuCategory[];
  totalItems: number;
}

export async function getRestaurants(
  latitude: string,
  longitude: string,
  page: number = 1
): Promise<RestaurantsResponse> {
  const token = await getToken();
  const pageSize = 50;

  const params = new URLSearchParams({
    sortType: "RESTAURANT_SCORE",
    minBasketPrice: "400",
    openRestaurants: "true",
    latitude,
    longitude,
    pageSize: pageSize.toString(),
    page: page.toString()
  });

  const response = await fetch(
    `${API_BASE}/web-discovery-apidiscovery-santral/restaurants/filters?${params}`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch restaurants: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform to simplified format for AI context efficiency
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
    campaignText: r.campaignText
  }));

  return {
    restaurants,
    totalCount: data.restaurantCount,
    currentPage: page,
    pageSize,
    hasNextPage: !!data.links?.next?.href
  };
}

export async function getRestaurantMenu(
  restaurantId: number,
  latitude: string,
  longitude: string
): Promise<RestaurantMenuResponse> {
  const token = await getToken();

  const params = new URLSearchParams({ latitude, longitude });

  const response = await fetch(
    `${API_BASE}/web-restaurant-apirestaurant-santral/restaurants/${restaurantId}?${params}`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch restaurant menu: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const restaurant = data.restaurant;

  // Transform restaurant info
  const info: RestaurantInfo = {
    id: restaurant.info.id,
    name: restaurant.info.name,
    status: restaurant.info.status,
    rating: restaurant.info.score?.overall ?? 0,
    ratingText: restaurant.info.score?.ratingText ?? "",
    workingHours: restaurant.info.workingHours,
    deliveryTime: restaurant.info.deliveryInfo?.eta ?? "",
    minOrderPrice: restaurant.info.deliveryInfo?.minPrice ?? 0
  };

  // Transform categories and products
  let totalItems = 0;
  const categories: MenuCategory[] = restaurant.sections.map((section: any) => {
    const items: MenuItem[] = section.products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      price: product.price?.salePrice ?? 0,
      likePercentage: product.productScore?.likePercentageInfo
    }));
    totalItems += items.length;

    return {
      name: section.name,
      slug: section.slug,
      items
    };
  });

  return {
    info,
    categories,
    totalItems
  };
}

export interface RecommendedItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string;
}

export interface RecommendationCollection {
  name: string;  // e.g. "Yanında İyi Gider" (Goes Well With)
  items: RecommendedItem[];
}

export interface ProductRecommendationsResponse {
  collections: RecommendationCollection[];
  totalItems: number;
}

export async function getProductRecommendations(
  restaurantId: number,
  productIds: number[]
): Promise<ProductRecommendationsResponse> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-discovery-apidiscovery-santral/recommendation/product`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      },
      body: JSON.stringify({
        restaurantId: restaurantId.toString(),
        productIds: productIds.map(id => id.toString()),
        page: "PDP"
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch product recommendations: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform to simplified format
  let totalItems = 0;
  const collections: RecommendationCollection[] = (data.collections || []).map((collection: any) => {
    const items: RecommendedItem[] = (collection.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.sellingPrice ?? 0,
      imageUrl: item.imageUrl ?? ""
    }));
    totalItems += items.length;

    return {
      name: collection.name,
      items
    };
  });

  return {
    collections,
    totalItems
  };
}

export interface ProductOption {
  id: number;
  name: string;
  price: number;         // additional cost (0 for no extra charge)
  selected: boolean;
  isPopular?: boolean;   // derived from badges
}

export interface ProductComponent {
  type: "INGREDIENTS" | "MODIFIER_GROUP";
  title: string;
  description?: string;
  modifierGroupId?: number;  // Only for MODIFIER_GROUP type, needed for addToBasket
  options: ProductOption[];
  isSingleChoice: boolean;  // true = radio, false = checkbox
  minSelections: number;    // 0 = optional, 1+ = required
  maxSelections: number;    // 0 = unlimited
}

export interface ProductDetailsResponse {
  restaurantId: number;
  restaurantName: string;
  productId: number;
  productName: string;
  description: string;
  imageUrl: string;
  price: number;
  maxQuantity: number;
  components: ProductComponent[];
}

export async function getProductDetails(
  restaurantId: number,
  productId: number,
  latitude: string,
  longitude: string
): Promise<ProductDetailsResponse> {
  const token = await getToken();

  const params = new URLSearchParams({ latitude, longitude });

  const response = await fetch(
    `${API_BASE}/web-restaurant-apirestaurant-santral/restaurants/${restaurantId}/products/${productId}?${params}`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch product details: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform components to simplified format
  const components: ProductComponent[] = (data.components || []).map((comp: any) => ({
    type: comp.type,
    title: comp.title,
    description: comp.description,
    modifierGroupId: comp.modifierGroupId,  // Include for MODIFIER_GROUP types
    options: (comp.options || []).map((opt: any) => ({
      id: opt.optionId,
      name: opt.title,
      price: opt.price?.salePrice ?? 0,
      selected: opt.selected ?? false,
      isPopular: opt.badges?.some((b: any) => b.type === "POPULAR_OPTION") ?? false
    })),
    isSingleChoice: comp.isSingleChoice ?? false,
    minSelections: comp.min ?? 0,
    maxSelections: comp.max ?? 0
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
    components
  };
}

// Add to Basket interfaces
export interface IngredientExclusion {
  id: number;  // ID of ingredient to exclude
}

export interface ModifierProduct {
  productId: number;           // Selected option's product ID
  modifierGroupId: number;     // The modifier group this belongs to
  modifierProducts: ModifierProduct[];  // Nested modifiers (usually empty)
  ingredientOptions: {
    excludes: IngredientExclusion[];
    includes: [];  // Not typically used
  };
}

export interface BasketItem {
  productId: number;
  quantity: number;
  modifierProducts: ModifierProduct[];
  ingredientOptions: {
    excludes: IngredientExclusion[];
    includes: [];
  };
}

export interface AddToBasketRequest {
  storeId: number;             // Restaurant ID
  items: BasketItem[];
  isFlashSale: boolean;        // Enable flash sale discounts
  storePickup: boolean;        // false = delivery
  latitude: number;
  longitude: number;
}

export interface CartProduct {
  productId: number;
  itemId: string;              // UUID for this cart item
  name: string;
  quantity: number;
  salePrice: number;
  description: string;         // Includes modifier descriptions
}

export interface CartStore {
  id: number;
  name: string;
  imageUrl: string;
  rating: number;
  averageDeliveryInterval: string;
  minAmount: number;
}

export interface CartSummaryLine {
  title: string;
  amount: number;
  isPromotion?: boolean;
}

export interface AddToBasketResponse {
  store: CartStore;
  products: CartProduct[];
  summary: CartSummaryLine[];
  totalProductCount: number;
  totalProductPrice: number;           // Before discounts
  totalProductPriceDiscounted: number; // After discounts
  totalPrice: number;                  // Final price
  deliveryPrice: number;
}

export interface SetShippingAddressRequest {
  shippingAddressId: number;
  invoiceAddressId: number;
}

export async function setShippingAddress(
  request: SetShippingAddressRequest
): Promise<void> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/shipping`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      },
      body: JSON.stringify(request)
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to set shipping address: ${response.status} ${response.statusText}`);
  }
}

export async function addToBasket(
  request: AddToBasketRequest
): Promise<AddToBasketResponse> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts/items`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      },
      body: JSON.stringify({
        storeId: request.storeId,
        items: request.items,
        isFlashSale: false,      // Always false
        storePickup: false,      // Always false (delivery mode)
        latitude: request.latitude,
        longitude: request.longitude
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to add to basket: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract store info from first grouped product
  const storeData = data.groupedProducts?.[0]?.store;
  const store: CartStore = {
    id: storeData?.id ?? request.storeId,
    name: storeData?.name ?? "",
    imageUrl: storeData?.imageUrl ?? "",
    rating: storeData?.rating ?? 0,
    averageDeliveryInterval: storeData?.averageDeliveryInterval ?? "",
    minAmount: storeData?.minAmount ?? 0
  };

  // Extract products from grouped products
  const products: CartProduct[] = (data.groupedProducts?.[0]?.products || []).map((p: any) => ({
    productId: p.productId,
    itemId: p.itemId,
    name: p.name,
    quantity: p.quantity,
    salePrice: p.salePrice,
    description: p.description ?? ""
  }));

  // Transform summary
  const summary: CartSummaryLine[] = (data.summary || []).map((s: any) => ({
    title: s.title,
    amount: s.amount,
    isPromotion: s.isPromotion ?? false
  }));

  return {
    store,
    products,
    summary,
    totalProductCount: data.totalProductCount ?? 0,
    totalProductPrice: data.totalProductPrice ?? 0,
    totalProductPriceDiscounted: data.totalProductPriceDiscounted ?? 0,
    totalPrice: data.totalPrice ?? 0,
    deliveryPrice: data.deliveryPrice ?? 0
  };
}

// Get Basket interfaces
export interface CartProductDetails extends CartProduct {
  marketPrice: number;
  modifierProducts: Array<{
    productId: number;
    modifierGroupId: number;
    name: string;
    price: number;
  }>;
  ingredientExcludes: Array<{
    id: number;
    name: string;
  }>;
}

export interface CartStoreGroup {
  store: CartStore;
  products: CartProductDetails[];
}

export interface GetBasketResponse {
  storeGroups: CartStoreGroup[];
  summary: CartSummaryLine[];
  totalProductCount: number;
  totalProductPrice: number;
  totalProductPriceDiscounted: number;
  totalPrice: number;
  deliveryPrice: number;
  isEmpty: boolean;
}

export async function getBasket(): Promise<GetBasketResponse> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get basket: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform grouped products to store groups
  const storeGroups: CartStoreGroup[] = (data.groupedProducts || []).map((group: any) => ({
    store: {
      id: group.store?.id ?? 0,
      name: group.store?.name ?? "",
      imageUrl: group.store?.imageUrl ?? "",
      rating: group.store?.rating ?? 0,
      averageDeliveryInterval: group.store?.averageDeliveryInterval ?? "",
      minAmount: group.store?.minAmount ?? 0
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
        price: m.price
      })),
      ingredientExcludes: (p.ingredientOption?.excludes || []).map((e: any) => ({
        id: e.id,
        name: e.name
      }))
    }))
  }));

  // Transform summary
  const summary: CartSummaryLine[] = (data.summary || []).map((s: any) => ({
    title: s.title,
    amount: s.amount,
    isPromotion: s.isPromotion ?? false
  }));

  return {
    storeGroups,
    summary,
    totalProductCount: data.totalProductCount ?? 0,
    totalProductPrice: data.totalProductPrice ?? 0,
    totalProductPriceDiscounted: data.totalProductPriceDiscounted ?? 0,
    totalPrice: data.totalPrice ?? 0,
    deliveryPrice: data.deliveryPrice ?? 0,
    isEmpty: (data.totalProductCount ?? 0) === 0
  };
}

export async function removeFromBasket(itemId: string): Promise<GetBasketResponse> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts/items/${itemId}`,
    {
      method: "DELETE",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove from basket: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform using same logic as getBasket
  const storeGroups: CartStoreGroup[] = (data.groupedProducts || []).map((group: any) => ({
    store: {
      id: group.store?.id ?? 0,
      name: group.store?.name ?? "",
      imageUrl: group.store?.imageUrl ?? "",
      rating: group.store?.rating ?? 0,
      averageDeliveryInterval: group.store?.averageDeliveryInterval ?? "",
      minAmount: group.store?.minAmount ?? 0
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
        price: m.price
      })),
      ingredientExcludes: (p.ingredientOption?.excludes || []).map((e: any) => ({
        id: e.id,
        name: e.name
      }))
    }))
  }));

  const summary: CartSummaryLine[] = (data.summary || []).map((s: any) => ({
    title: s.title,
    amount: s.amount,
    isPromotion: s.isPromotion ?? false
  }));

  return {
    storeGroups,
    summary,
    totalProductCount: data.totalProductCount ?? 0,
    totalProductPrice: data.totalProductPrice ?? 0,
    totalProductPriceDiscounted: data.totalProductPriceDiscounted ?? 0,
    totalPrice: data.totalPrice ?? 0,
    deliveryPrice: data.deliveryPrice ?? 0,
    isEmpty: (data.totalProductCount ?? 0) === 0
  };
}

export async function clearBasket(): Promise<void> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts`,
    {
      method: "DELETE",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to clear basket: ${response.status} ${response.statusText}`);
  }
}

// Search Restaurants interfaces
export interface SearchProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

export interface SearchRestaurant extends Restaurant {
  products: SearchProduct[];  // Matching products shown in search
  warning?: string;  // Warning message for closed restaurants
}

export interface SearchRestaurantsResponse {
  restaurants: SearchRestaurant[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  searchQuery: string;
}

// Location helper interfaces
export interface City {
  id: number;
  code: string;
  name: string;
}

export interface District {
  id: number;
  name: string;
}

export interface Neighborhood {
  id: number;
  name: string;
}

export interface CitiesResponse {
  cities: City[];
  count: number;
}

export interface DistrictsResponse {
  districts: District[];
  count: number;
  cityId: number;
}

export interface NeighborhoodsResponse {
  neighborhoods: Neighborhood[];
  count: number;
  districtId: number;
}

export async function getCities(): Promise<CitiesResponse> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-user-apimemberaddress-santral/cities`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch cities: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const cities: City[] = (data.cities || []).map((c: any) => ({
    id: c.id,
    code: c.code,
    name: c.name
  }));

  return {
    cities,
    count: cities.length
  };
}

export async function getDistricts(cityId: number): Promise<DistrictsResponse> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-user-apimemberaddress-santral/cities/${cityId}/districts`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch districts: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const districts: District[] = (data.districts || []).map((d: any) => ({
    id: d.id,
    name: d.name
  }));

  return {
    districts,
    count: districts.length,
    cityId
  };
}

export async function getNeighborhoods(districtId: number): Promise<NeighborhoodsResponse> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-user-apimemberaddress-santral/districts/${districtId}/neighborhoods`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch neighborhoods: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const neighborhoods: Neighborhood[] = (data.neighborhoods || []).map((n: any) => ({
    id: n.id,
    name: n.name
  }));

  return {
    neighborhoods,
    count: neighborhoods.length,
    districtId
  };
}

// Add Address interfaces
export interface AddAddressRequest {
  name: string;
  surname: string;
  phone: string;              // Without country code, e.g. "5356437070"
  apartmentNumber?: string;
  floor?: string;
  doorNumber?: string;
  addressName: string;        // User-friendly name like "Home", "Work"
  addressDescription?: string; // Additional details
  addressLine: string;        // Street address
  cityId: number;
  districtId: number;
  neighborhoodId: number;
  latitude: string;
  longitude: string;
  countryCode?: string;       // Default: "TR"
  elevatorAvailable?: boolean; // Default: false
}

export interface AddAddressResponse {
  success: boolean;
  address?: Address;          // Returned address on success
  requiresOtp?: boolean;      // True if 429 received
  message: string;
}

export async function addAddress(request: AddAddressRequest): Promise<AddAddressResponse> {
  const token = await getToken();

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
    elevatorAvailable: request.elevatorAvailable ?? false
  };

  const response = await fetch(`${API_BASE}/web-user-apimemberaddress-santral/addresses`, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "Origin": "https://tgoyemek.com",
      "x-correlationid": randomUUID(),
      "pid": randomUUID(),
      "sid": randomUUID()
    },
    body: JSON.stringify(payload)
  });

  // Handle OTP required case (429 Too Many Requests)
  if (response.status === 429) {
    return {
      success: false,
      requiresOtp: true,
      message: "OTP verification required. Please add this address through the TGO Yemek website."
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to add address: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform the returned address
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
    elevatorAvailable: data.elevatorAvailable ?? false
  };

  return {
    success: true,
    address,
    message: "Address added successfully"
  };
}

// Saved Card interfaces
export interface SavedCard {
  cardId: number;
  name: string;                    // Card nickname
  maskedCardNumber: string;        // e.g., "554960******0023"
  cardTypeName: string;            // e.g., "BONUS"
  bankName: string;                // e.g., "Garanti BBVA"
  isDebitCard: boolean;
  cvvRequired: boolean;
  cardNetwork: string;             // e.g., "Mastercard"
}

export interface SavedCardsResponse {
  cards: SavedCard[];
  hasCards: boolean;
  message?: string;                // Guidance message if no cards
}

export interface CheckoutReadyResponse {
  ready: boolean;
  store: CartStore;
  products: CartProductDetails[];
  summary: CartSummaryLine[];
  totalPrice: number;
  deliveryPrice: number;
  warnings: string[];
}

export interface PlaceOrderResponse {
  success: boolean;
  orderId?: string;
  requires3DSecure?: boolean;  // If true, user must complete on website
  redirectUrl?: string;        // 3D Secure URL if needed
  htmlContent?: string;        // 3D Secure HTML form if provided
  message: string;
}

export interface CustomerNoteRequest {
  customerNote: string;
  noServiceWare: boolean;      // "Servis İstemiyorum" toggle
  contactlessDelivery: boolean; // "Temassız Teslimat" toggle
  dontRingBell: boolean;        // "Zile Basma" toggle
}

export async function updateCustomerNote(request: CustomerNoteRequest): Promise<void> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts/customerNote`,
    {
      method: "PUT",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      },
      body: JSON.stringify({
        customerNote: request.customerNote,
        noServiceWare: request.noServiceWare,
        contactlessDelivery: request.contactlessDelivery,
        dontRingBell: request.dontRingBell
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update customer note: ${response.status} ${response.statusText}`);
  }
}

export async function getSavedCards(): Promise<SavedCardsResponse> {
  const token = await getToken();

  const response = await fetch(`${PAYMENT_API_BASE}/v2/cards/`, {
    method: "GET",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Authorization": `Bearer ${token}`,
      "User-Agent": USER_AGENT,
      "Origin": "https://tgoyemek.com",
      "app-name": "TrendyolGo",
      "x-applicationid": "1",
      "x-channelid": "4",
      "x-storefrontid": "1",
      "x-features": "OPTIONAL_REBATE;MEAL_CART_ENABLED",
      "x-supported-payment-options": "MULTINET;SODEXO;EDENRED;ON_DELIVERY;SETCARD",
      "x-correlationid": randomUUID(),
      "pid": randomUUID(),
      "sid": randomUUID()
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch saved cards: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const cardsData = data.json?.cards || data.cards || [];

  const cards: SavedCard[] = cardsData.map((c: any) => ({
    cardId: c.cardId,
    name: c.name ?? "",
    maskedCardNumber: c.maskedCardNumber ?? "",
    cardTypeName: c.cardTypeName ?? "",
    bankName: c.bankName ?? "",
    isDebitCard: c.isDebitCard ?? false,
    cvvRequired: c.cvvRequired ?? false,
    cardNetwork: c.cardNetwork ?? ""
  }));

  if (cards.length === 0) {
    return {
      cards: [],
      hasCards: false,
      message: "No saved cards. Please add a payment method at tgoyemek.com"
    };
  }

  return {
    cards,
    hasCards: true
  };
}

export async function getCheckoutReady(): Promise<CheckoutReadyResponse> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts?cartContext=payment&limitPromoMbs=false`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  // Handle 400 error (typically means empty cart)
  if (response.status === 400) {
    return {
      ready: false,
      store: {
        id: 0,
        name: "",
        imageUrl: "",
        rating: 0,
        averageDeliveryInterval: "",
        minAmount: 0
      },
      products: [],
      summary: [],
      totalPrice: 0,
      deliveryPrice: 0,
      warnings: ["Cart is empty. Add items before checkout."]
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to get checkout ready: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract warnings from response
  const warnings: string[] = [];
  if (data.warnings) {
    warnings.push(...data.warnings.map((w: any) => w.message || String(w)));
  }

  // Check if cart is empty
  if ((data.totalProductCount ?? 0) === 0) {
    return {
      ready: false,
      store: {
        id: 0,
        name: "",
        imageUrl: "",
        rating: 0,
        averageDeliveryInterval: "",
        minAmount: 0
      },
      products: [],
      summary: [],
      totalPrice: 0,
      deliveryPrice: 0,
      warnings: ["Cart is empty. Add items before checkout."]
    };
  }

  // Extract store and products from first group
  const group = data.groupedProducts?.[0];
  const store: CartStore = {
    id: group?.store?.id ?? 0,
    name: group?.store?.name ?? "",
    imageUrl: group?.store?.imageUrl ?? "",
    rating: group?.store?.rating ?? 0,
    averageDeliveryInterval: group?.store?.averageDeliveryInterval ?? "",
    minAmount: group?.store?.minAmount ?? 0
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
      price: m.price
    })),
    ingredientExcludes: (p.ingredientOption?.excludes || []).map((e: any) => ({
      id: e.id,
      name: e.name
    }))
  }));

  const summary: CartSummaryLine[] = (data.summary || []).map((s: any) => ({
    title: s.title,
    amount: s.amount,
    isPromotion: s.isPromotion ?? false
  }));

  // Check minimum order amount
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
    warnings
  };
}

async function selectPaymentMethod(cardId: number, binCode: string): Promise<void> {
  const token = await getToken();

  const response = await fetch(`${PAYMENT_API_BASE}/v3/payment/options`, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "Origin": "https://tgoyemek.com",
      "app-name": "TrendyolGo",
      "x-applicationid": "1",
      "x-channelid": "4",
      "x-storefrontid": "1",
      "x-features": "OPTIONAL_REBATE;MEAL_CART_ENABLED",
      "x-supported-payment-options": "MULTINET;SODEXO;EDENRED;ON_DELIVERY;SETCARD",
      "x-correlationid": randomUUID(),
      "pid": randomUUID(),
      "sid": randomUUID()
    },
    body: JSON.stringify({
      paymentType: "payWithCard",
      data: {
        savedCardId: cardId,
        binCode: binCode,
        installmentId: 0,
        reward: null,
        installmentPostponingSelected: false
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to select payment method: ${response.status} ${response.statusText}`);
  }
}

export async function placeOrder(cardId: number): Promise<PlaceOrderResponse> {
  const token = await getToken();

  // First, get the saved cards to find the bin code for this card
  const cardsResponse = await getSavedCards();
  const card = cardsResponse.cards.find(c => c.cardId === cardId);

  if (!card) {
    return {
      success: false,
      message: `Card with ID ${cardId} not found. Use get_saved_cards to see available cards.`
    };
  }

  // Extract bin code from masked card number (first 6 digits + **)
  const binCode = card.maskedCardNumber.substring(0, 6) + "**";

  // IMPORTANT: Use the same session IDs across all payment-related calls
  // This is required for the payment system to track the transaction properly
  const correlationId = randomUUID();
  const pid = randomUUID();
  const sid = randomUUID();

  const paymentHeaders = {
    "Accept": "application/json, text/plain, */*",
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "Origin": "https://tgoyemek.com",
    "app-name": "TrendyolGo",
    "x-applicationid": "1",
    "x-channelid": "4",
    "x-storefrontid": "1",
    "x-features": "OPTIONAL_REBATE;MEAL_CART_ENABLED",
    "x-supported-payment-options": "MULTINET;SODEXO;EDENRED;ON_DELIVERY;SETCARD",
    "x-correlationid": correlationId,
    "pid": pid,
    "sid": sid
  };

  // Step 1: Initialize cart state in payment system
  const checkoutResponse = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/carts?cartContext=payment&limitPromoMbs=false`,
    { method: "GET", headers: paymentHeaders }
  );

  if (!checkoutResponse.ok) {
    return {
      success: false,
      message: `Failed to initialize checkout: ${checkoutResponse.status} ${checkoutResponse.statusText}`
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
        installmentPostponingSelected: false
      }
    })
  });

  if (!optionsResponse.ok) {
    return {
      success: false,
      message: `Failed to select payment method: ${optionsResponse.status} ${optionsResponse.statusText}`
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
          customerSelectedThreeD: false
        }
      ],
      callbackUrl: "https://tgoyemek.com/odeme"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Check for 3D Secure requirement in error response
    if (response.status === 400 || response.status === 403) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.redirectUrl || errorData.requires3DSecure || errorData.threeDSecureUrl || errorData.htmlContent || errorData.json?.content) {
          return {
            success: false,
            requires3DSecure: true,
            redirectUrl: errorData.redirectUrl || errorData.threeDSecureUrl,
            htmlContent: errorData.htmlContent || errorData.json?.content,
            message: "3D Secure verification required. Complete payment in browser."
          };
        }
      } catch {
        // Not JSON, continue with generic error
      }
    }

    throw new Error(`Failed to place order: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Check if 3D Secure HTML content is returned (successful 3D Secure initiation)
  if (data.json?.content) {
    // Extract redirect URL from HTML form if present
    const formMatch = data.json.content.match(/action="([^"]+)"/);
    const redirectUrl = formMatch ? formMatch[1] : undefined;

    return {
      success: false,
      requires3DSecure: true,
      redirectUrl,
      htmlContent: data.json.content,
      message: "3D Secure verification required. Complete payment in browser."
    };
  }

  // Check other 3D Secure indicators
  if (data.requires3DSecure || data.redirectUrl || data.threeDSecureUrl || data.htmlContent) {
    return {
      success: false,
      requires3DSecure: true,
      redirectUrl: data.redirectUrl || data.threeDSecureUrl,
      htmlContent: data.htmlContent,
      message: "3D Secure verification required. Complete payment in browser."
    };
  }

  return {
    success: true,
    orderId: data.orderId || data.orderNumber || data.id,
    message: "Order placed successfully!"
  };
}

// Order interfaces
export interface OrderStatus {
  status: string;           // "CREATED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  statusText: string;       // e.g., "Sipariş Hazırlanıyor"
  statusColor: string;      // e.g., "#FFB600"
}

export interface OrderStore {
  id: number;
  name: string;
}

export interface OrderPrice {
  totalPrice: number;
  totalPriceText: string;
  refundedPrice: number;
  cancelledPrice: number;
  totalDeliveryPrice: number;
  totalServicePrice: number;
}

export interface OrderProductSummary {
  productId: number;
  name: string;
  imageUrl: string;
}

export interface Order {
  id: string;
  orderDate: string;
  store: OrderStore;
  status: OrderStatus;
  price: OrderPrice;
  productSummary: string;      // Combined product names
  products: OrderProductSummary[];
  isReady: boolean;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    hasNext: boolean;
  };
}

export interface OrderDetailProduct {
  name: string;
  imageUrl: string;
  salePrice: number;
  salePriceText: string;
  quantity: number;
  description: string;
}

export interface OrderStatusStep {
  status: string;
  statusText: string;
}

export interface OrderShipmentItem {
  status: OrderStatus;
  statusSteps: OrderStatusStep[];  // Progress: CREATED → PREPARING → SHIPPED → DELIVERED
  products: OrderDetailProduct[];
}

export interface OrderDetail {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerNote: string;
  store: OrderStore;
  eta: string;                     // e.g., "20 - 30 dk"
  deliveredDate: string;
  status: OrderStatus;
  statusSteps: OrderStatusStep[];
  products: OrderDetailProduct[];
  price: OrderPrice;
  paymentDescription: string;      // e.g., "**** ****** 0023 - Tek Çekim"
  deliveryAddress: {
    name: string;
    address: string;
    districtCity: string;
    phoneNumber: string;
  };
}

export async function getOrders(page: number = 1): Promise<OrdersResponse> {
  const token = await getToken();
  const pageSize = 50;

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  });

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/orders?${params}`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform orders to simplified format
  const orders: Order[] = (data.orders || []).map((o: any) => ({
    id: o.id,
    orderDate: o.orderDate ?? "",
    store: {
      id: o.store?.id ?? 0,
      name: o.store?.name ?? ""
    },
    status: {
      status: o.status?.status ?? "",
      statusText: o.status?.statusText ?? "",
      statusColor: o.status?.statusColor ?? ""
    },
    price: {
      totalPrice: o.price?.totalPrice ?? 0,
      totalPriceText: o.price?.totalPriceText ?? "",
      refundedPrice: o.price?.refundedPrice ?? 0,
      cancelledPrice: o.price?.cancelledPrice ?? 0,
      totalDeliveryPrice: o.price?.totalDeliveryPrice ?? 0,
      totalServicePrice: o.price?.totalServicePrice ?? 0
    },
    productSummary: o.product?.name ?? "",
    products: (o.productList || []).map((p: any) => ({
      productId: p.productId,
      name: p.name,
      imageUrl: p.imageUrl ?? ""
    })),
    isReady: o.isReady ?? false
  }));

  return {
    orders,
    pagination: {
      currentPage: data.pagination?.currentPage ?? page,
      pageSize: data.pagination?.pageSize ?? pageSize,
      totalCount: data.pagination?.totalCount ?? 0,
      hasNext: data.pagination?.hasNext ?? false
    }
  };
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail> {
  const token = await getToken();

  const params = new URLSearchParams({
    orderId
  });

  const response = await fetch(
    `${API_BASE}/web-checkout-apicheckout-santral/orders/detail?${params}`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch order detail: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract shipment info
  const shipment = data.shipment;
  const shipmentSummary = shipment?.summary;
  const shipmentItem = shipment?.items?.[0];

  // Extract status steps from shipment item state
  const statusSteps: OrderStatusStep[] = (shipmentItem?.state?.statuses || []).map((s: any) => ({
    status: s.status ?? "",
    statusText: s.statusText ?? ""
  }));

  // Extract products from shipment item
  const products: OrderDetailProduct[] = (shipmentItem?.products || []).map((p: any) => ({
    name: p.name ?? "",
    imageUrl: p.imageUrl ?? "",
    salePrice: p.salePrice ?? 0,
    salePriceText: p.salePriceText ?? "",
    quantity: p.quantity ?? 1,
    description: p.description ?? ""
  }));

  // Extract delivery address
  const addr = data.deliveryAddress;

  // Extract price from summary
  const summaryPrice = data.summary?.price;

  return {
    orderId: data.summary?.orderId ?? orderId,
    orderNumber: data.summary?.orderNumber ?? "",
    orderDate: data.summary?.orderDate ?? "",
    customerNote: data.summary?.customerNote ?? "",
    store: {
      id: parseInt(shipmentSummary?.store?.id, 10) || 0,
      name: shipmentSummary?.store?.name ?? ""
    },
    eta: shipmentSummary?.eta ?? "",
    deliveredDate: shipmentSummary?.deliveredDate ?? "",
    status: {
      status: shipmentItem?.status?.status ?? "",
      statusText: shipmentItem?.status?.statusText ?? "",
      statusColor: shipmentItem?.status?.statusColor ?? ""
    },
    statusSteps,
    products,
    price: {
      totalPrice: summaryPrice?.totalPrice ?? 0,
      totalPriceText: summaryPrice?.totalPriceText ?? "",
      refundedPrice: summaryPrice?.refundedPrice ?? 0,
      cancelledPrice: summaryPrice?.cancelledPrice ?? 0,
      totalDeliveryPrice: summaryPrice?.totalDeliveryPrice ?? 0,
      totalServicePrice: summaryPrice?.totalServicePrice ?? 0
    },
    paymentDescription: data.paymentInfo?.paymentDescription ?? "",
    deliveryAddress: {
      name: addr?.name ?? "",
      address: addr?.address ?? "",
      districtCity: addr?.districtCity ?? "",
      phoneNumber: addr?.phoneNumber ?? ""
    }
  };
}

export async function searchRestaurants(
  searchQuery: string,
  latitude: string,
  longitude: string,
  page: number = 1
): Promise<SearchRestaurantsResponse> {
  const token = await getToken();
  const pageSize = 50;

  const params = new URLSearchParams({
    searchQuery,
    latitude,
    longitude,
    pageSize: pageSize.toString(),
    page: page.toString()
  });

  const response = await fetch(
    `${API_BASE}/web-restaurant-apirestaurant-santral/restaurants/in/search?${params}`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Origin": "https://tgoyemek.com",
        "x-correlationid": randomUUID(),
        "pid": randomUUID(),
        "sid": randomUUID()
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to search restaurants: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform to simplified format for AI context efficiency
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
        imageUrl: p.imageUrl
      })),
      ...(isClosed && { warning: "This restaurant is currently closed. Do not proceed with ordering from this restaurant." })
    };
  });

  return {
    restaurants,
    totalCount: data.restaurantCount ?? 0,
    currentPage: page,
    pageSize,
    hasNextPage: !!data.links?.next?.href,
    searchQuery: data.searchQuery ?? searchQuery
  };
}
