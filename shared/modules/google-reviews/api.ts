// shared/modules/google-reviews/api.ts - Google Places API Functions

import type {
  GooglePlaceCandidate,
  GooglePlaceDetailsResponse,
  GooglePlaceSearchResponse,
  GoogleReview,
  GoogleReviewsResponse,
  GetGoogleReviewsRequest,
  GooglePlaceMatch,
  LegacyPlaceDetailsResponse,
  GeoPoint,
} from "./types.js";
import { fetchWithRetry } from "./utils.js";
import { calculateMatchScore } from "./matching.js";
import { createCacheKey, googleReviewsCache } from "./cache.js";

const GOOGLE_PLACES_API_BASE = "https://places.googleapis.com/v1";

/**
 * Search for a place using Google Places Text Search API.
 * Includes timeout and retry logic.
 */
export async function searchGooglePlace(
  apiKey: string,
  name: string,
  neighborhood: string,
  lat: number,
  lng: number
): Promise<GooglePlaceCandidate[]> {
  const searchQuery = `${name} ${neighborhood}`;

  const response = await fetchWithRetry(
    `${GOOGLE_PLACES_API_BASE}/places:searchText`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 5000, // 5km radius
          },
        },
        maxResultCount: 5,
      }),
    },
    { timeout: 10000, retries: 2 }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Google Places API rate limit exceeded. Please try again later.");
    }
    throw new Error(`Google Places search failed: ${response.status} ${response.statusText}`);
  }

  const data: GooglePlaceSearchResponse = await response.json();
  return data.places || [];
}

/**
 * Get place details including reviews from Google Places API.
 * Uses legacy API for reviews to support sorting by newest.
 * Includes timeout and retry logic.
 */
export async function getGooglePlaceDetails(
  apiKey: string,
  placeId: string
): Promise<GooglePlaceDetailsResponse | null> {
  // Use Legacy Places API for reviews - it supports reviews_sort=newest
  const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=place_id,name,formatted_address,geometry,rating,user_ratings_total,reviews&reviews_sort=newest&key=${apiKey}`;

  const response = await fetchWithRetry(
    legacyUrl,
    { method: "GET" },
    { timeout: 10000, retries: 2 }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Google Places API rate limit exceeded. Please try again later.");
    }
    // Don't throw for details failure, return null to allow fallback
    return null;
  }

  const legacyData: LegacyPlaceDetailsResponse = await response.json();

  if (legacyData.status !== "OK" || !legacyData.result) {
    return null;
  }

  const result = legacyData.result;

  // Convert legacy format to our standard format
  return {
    id: result.place_id,
    displayName: { text: result.name },
    formattedAddress: result.formatted_address,
    location: {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    },
    rating: result.rating,
    userRatingCount: result.user_ratings_total,
    reviews: (result.reviews || []).map((r) => ({
      authorAttribution: { displayName: r.author_name },
      rating: r.rating,
      relativePublishTimeDescription: r.relative_time_description,
      text: { text: r.text },
      publishTime: new Date(r.time * 1000).toISOString(),
    })),
  };
}

/**
 * Main function to get Google reviews for a restaurant.
 * Uses branch matching algorithm to find the correct location.
 * Includes caching with LRU eviction.
 *
 * @param apiKey - Google Places API key (can be empty for graceful degradation)
 * @param request - Restaurant details from TGO
 * @returns GoogleReviewsResponse with reviews or error message
 */
export async function getGoogleReviews(
  apiKey: string,
  request: GetGoogleReviewsRequest
): Promise<GoogleReviewsResponse> {
  // Graceful degradation when API key is not configured
  if (!apiKey) {
    return {
      found: false,
      error: "Google Reviews unavailable: GOOGLE_PLACES_API_KEY not configured. This feature is optional.",
    };
  }

  // Check cache first
  const cacheKey = createCacheKey(request);
  const cached = googleReviewsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const userLocation: GeoPoint = {
    latitude: parseFloat(request.latitude),
    longitude: parseFloat(request.longitude),
  };

  // Step 1: Search for candidates
  let candidates: GooglePlaceCandidate[];
  try {
    candidates = await searchGooglePlace(
      apiKey,
      request.restaurantName,
      request.neighborhoodName,
      userLocation.latitude,
      userLocation.longitude
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      found: false,
      error: message,
    };
  }

  if (candidates.length === 0) {
    return {
      found: false,
      error: `No Google Places found for "${request.restaurantName}" near ${request.neighborhoodName}`,
    };
  }

  // Step 2: Score each candidate and find best match
  const scoredCandidates = candidates.map((candidate) => ({
    candidate,
    score: calculateMatchScore(
      candidate,
      request.restaurantName,
      request.neighborhoodName,
      request.tgoDistance,
      userLocation
    ),
  }));

  // Sort by score descending
  scoredCandidates.sort((a, b) => b.score - a.score);
  const bestMatch = scoredCandidates[0];

  // Require minimum 70% confidence
  if (bestMatch.score < 70) {
    return {
      found: false,
      error: `Low confidence match (${bestMatch.score}%). Best candidate: "${bestMatch.candidate.displayName.text}" at ${bestMatch.candidate.formattedAddress}`,
    };
  }

  // Step 3: Get place details with reviews
  const match: GooglePlaceMatch = {
    placeId: bestMatch.candidate.id,
    displayName: bestMatch.candidate.displayName.text,
    formattedAddress: bestMatch.candidate.formattedAddress,
    location: bestMatch.candidate.location,
    matchScore: bestMatch.score,
  };

  try {
    const details = await getGooglePlaceDetails(apiKey, bestMatch.candidate.id);

    if (!details) {
      // Return basic match without reviews
      const result: GoogleReviewsResponse = {
        found: true,
        match,
        error: "Could not fetch reviews (place details unavailable)",
      };
      return result;
    }

    // Transform reviews (already sorted by newest from legacy API)
    const reviews: GoogleReview[] = (details.reviews || [])
      .slice(0, 10)
      .map((r) => ({
        authorName: r.authorAttribution.displayName,
        rating: r.rating,
        relativeTimeDescription: r.relativePublishTimeDescription,
        text: r.text?.text || "",
        publishTime: r.publishTime,
      }));

    // Build comparison if we have both ratings
    const googleRating = details.rating || 0;
    const tgoRating = request.tgoRating || 0;
    const ratingDiff = googleRating - tgoRating;
    const comparison = (googleRating && tgoRating) ? {
      tgoRating,
      googleRating,
      ratingDifference: Math.round(ratingDiff * 10) / 10,
      summary: ratingDiff > 0.3
        ? `Google rates higher (+${ratingDiff.toFixed(1)})`
        : ratingDiff < -0.3
        ? `TGO rates higher (${ratingDiff.toFixed(1)})`
        : `Ratings are similar`,
    } : undefined;

    const result: GoogleReviewsResponse = {
      found: true,
      match,
      rating: details.rating,
      userRatingCount: details.userRatingCount,
      reviews,
      comparison,
    };

    // Cache successful results
    googleReviewsCache.set(cacheKey, result);

    return result;
  } catch (error) {
    // Return match without reviews on details failure
    const message = error instanceof Error ? error.message : String(error);
    return {
      found: true,
      match,
      error: `Could not fetch reviews: ${message}`,
    };
  }
}
