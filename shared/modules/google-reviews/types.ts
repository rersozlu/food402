// shared/modules/google-reviews/types.ts - Google Reviews Type Definitions

/**
 * A single Google review
 */
export interface GoogleReview {
  authorName: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
  publishTime: string;
}

/**
 * Matched Google Place information
 */
export interface GooglePlaceMatch {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  matchScore: number;
}

/**
 * Response from getGoogleReviews
 */
export interface GoogleReviewsResponse {
  found: boolean;
  match?: GooglePlaceMatch;
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
  comparison?: {
    tgoRating: number;
    googleRating: number;
    ratingDifference: number;
    summary: string;
  };
  error?: string;
}

/**
 * Request parameters for getGoogleReviews
 */
export interface GetGoogleReviewsRequest {
  restaurantId: number;
  restaurantName: string;
  neighborhoodName: string;
  tgoDistance: number;
  tgoRating: number;
  latitude: string;
  longitude: string;
}

// Internal types

/**
 * Cache entry with expiration timestamp
 */
export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  accessedAt: number;
}

/**
 * Google Place candidate from search API
 */
export interface GooglePlaceCandidate {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
}

/**
 * Response from Google Places text search
 */
export interface GooglePlaceSearchResponse {
  places?: GooglePlaceCandidate[];
}

/**
 * Response from Google Places details API
 */
export interface GooglePlaceDetailsResponse {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{
    authorAttribution: { displayName: string };
    rating: number;
    relativePublishTimeDescription: string;
    text?: { text: string };
    publishTime: string;
  }>;
}

/**
 * Legacy API response format (supports reviews_sort=newest)
 */
export interface LegacyPlaceDetailsResponse {
  status: string;
  result?: {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name: string;
      rating: number;
      relative_time_description: string;
      text: string;
      time: number; // Unix timestamp
    }>;
  };
}

/**
 * Options for fetch with retry
 */
export interface FetchRetryOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Geographic point with latitude and longitude
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}
