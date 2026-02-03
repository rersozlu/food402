// src/api.ts - TGO Yemek API Functions (Local wrapper using getToken)

import { getToken } from "./auth.js";
import * as sharedApi from "../shared/api.js";
import type { GetGoogleReviewsRequest, GoogleReviewsResponse } from "../shared/types.js";

// Re-export all types from shared module
export type {
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
  IngredientExclusion,
  ModifierProduct,
  BasketItem,
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
  OrderShipmentItem,
  OrderDetail,
} from "../shared/types.js";

// Wrapper functions that automatically inject the token

export async function getAddresses() {
  const token = await getToken();
  return sharedApi.getAddresses(token);
}

export async function getRestaurants(
  latitude: string,
  longitude: string,
  page: number = 1,
  sortType: sharedApi.RestaurantSortType = "RECOMMENDED",
  minBasketPrice?: number
) {
  const token = await getToken();
  return sharedApi.getRestaurants(token, latitude, longitude, page, sortType, minBasketPrice);
}

export async function getRestaurantMenu(
  restaurantId: number,
  latitude: string,
  longitude: string
) {
  const token = await getToken();
  return sharedApi.getRestaurantMenu(token, restaurantId, latitude, longitude);
}

export async function getProductRecommendations(
  restaurantId: number,
  productIds: number[]
) {
  const token = await getToken();
  return sharedApi.getProductRecommendations(token, restaurantId, productIds);
}

export async function getProductDetails(
  restaurantId: number,
  productId: number,
  latitude: string,
  longitude: string
) {
  const token = await getToken();
  return sharedApi.getProductDetails(token, restaurantId, productId, latitude, longitude);
}

export async function setShippingAddress(
  request: sharedApi.SetShippingAddressRequest
) {
  const token = await getToken();
  return sharedApi.setShippingAddress(token, request);
}

export async function addToBasket(request: sharedApi.AddToBasketRequest) {
  const token = await getToken();
  return sharedApi.addToBasket(token, request);
}

export async function getBasket() {
  const token = await getToken();
  return sharedApi.getBasket(token);
}

export async function removeFromBasket(itemId: string) {
  const token = await getToken();
  return sharedApi.removeFromBasket(token, itemId);
}

export async function clearBasket() {
  const token = await getToken();
  return sharedApi.clearBasket(token);
}

export async function getCities() {
  const token = await getToken();
  return sharedApi.getCities(token);
}

export async function getDistricts(cityId: number) {
  const token = await getToken();
  return sharedApi.getDistricts(token, cityId);
}

export async function getNeighborhoods(districtId: number) {
  const token = await getToken();
  return sharedApi.getNeighborhoods(token, districtId);
}

export async function addAddress(request: sharedApi.AddAddressRequest) {
  const token = await getToken();
  return sharedApi.addAddress(token, request);
}

export async function updateCustomerNote(request: sharedApi.CustomerNoteRequest) {
  const token = await getToken();
  return sharedApi.updateCustomerNote(token, request);
}

export async function getSavedCards() {
  const token = await getToken();
  return sharedApi.getSavedCards(token);
}

export async function getCheckoutReady() {
  const token = await getToken();
  return sharedApi.getCheckoutReady(token);
}

export async function placeOrder(cardId: number) {
  const token = await getToken();
  return sharedApi.placeOrder(token, cardId);
}

export async function getOrders(page: number = 1) {
  const token = await getToken();
  return sharedApi.getOrders(token, page);
}

export async function getOrderDetail(orderId: string) {
  const token = await getToken();
  return sharedApi.getOrderDetail(token, orderId);
}

export async function searchRestaurants(
  searchQuery: string,
  latitude: string,
  longitude: string,
  page: number = 1
) {
  const token = await getToken();
  return sharedApi.searchRestaurants(token, searchQuery, latitude, longitude, page);
}

// ============================================
// Google Reviews with Caching
// ============================================

interface CacheEntry {
  data: GoogleReviewsResponse;
  expiresAt: number;
}

// Cache with 24-hour TTL, keyed by restaurantId-lat-lng
const googleReviewsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(request: GetGoogleReviewsRequest): string {
  // Round lat/lng to 4 decimal places (~11m precision) for cache key
  const lat = parseFloat(request.latitude).toFixed(4);
  const lng = parseFloat(request.longitude).toFixed(4);
  return `${request.restaurantId}-${lat}-${lng}`;
}

export async function getGoogleReviews(request: GetGoogleReviewsRequest): Promise<GoogleReviewsResponse> {
  const cacheKey = getCacheKey(request);
  const now = Date.now();

  // Check cache
  const cached = googleReviewsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // Get API key from environment
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // Fetch from Google
  const result = await sharedApi.getGoogleReviews(apiKey || "", request);

  // Only cache successful results
  if (result.found) {
    googleReviewsCache.set(cacheKey, {
      data: result,
      expiresAt: now + CACHE_TTL_MS,
    });
  }

  return result;
}
