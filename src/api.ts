// src/api.ts - TGO Yemek API Functions

import { getToken } from "./auth.js";
import { randomUUID } from "crypto";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const API_BASE = "https://api.tgoapis.com";

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
      body: JSON.stringify(request)
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
