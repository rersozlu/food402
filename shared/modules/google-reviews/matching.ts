// shared/modules/google-reviews/matching.ts - Restaurant Name Matching Logic

import type { GooglePlaceCandidate, GeoPoint } from "./types.js";
import { haversineDistance } from "./utils.js";

/**
 * Turkish character mapping (both cases mapped to lowercase)
 */
const TURKISH_CHAR_MAP: Record<string, string> = {
  'ş': 's', 'Ş': 's',
  'ğ': 'g', 'Ğ': 'g',
  'ı': 'i', 'İ': 'i',
  'ö': 'o', 'Ö': 'o',
  'ü': 'u', 'Ü': 'u',
  'ç': 'c', 'Ç': 'c',
};

/**
 * Common restaurant suffixes to remove during normalization
 */
const COMMON_SUFFIXES = [
  'restaurant', 'restoran', 'cafe', 'kafe',
  'kitchen', 'mutfak', 'kebap', 'kebab'
];

/**
 * Normalize restaurant name for comparison.
 * - Lowercase
 * - Remove common suffixes (Restaurant, Cafe, etc.)
 * - Normalize Turkish characters
 * - Remove punctuation and extra whitespace
 */
export function normalizeRestaurantName(name: string): string {
  let normalized = name;

  // Replace Turkish characters BEFORE lowercasing (İ.toLowerCase() can produce odd results)
  for (const [turkish, latin] of Object.entries(TURKISH_CHAR_MAP)) {
    normalized = normalized.replace(new RegExp(turkish, 'g'), latin);
  }

  normalized = normalized.toLowerCase();

  // Remove parenthetical content like "(Beytepe)" or "(Çayyolu)"
  normalized = normalized.replace(/\s*\([^)]*\)\s*/g, ' ');

  // Remove content after " - " (Google often appends location like "- Çankaya")
  normalized = normalized.replace(/\s*-\s+.*$/, '');

  // Remove common suffixes
  for (const suffix of COMMON_SUFFIXES) {
    normalized = normalized.replace(new RegExp(`\\s*${suffix}\\s*$`, 'i'), '');
  }

  // Remove punctuation and normalize whitespace
  normalized = normalized
    .replace(/[''`´]/g, '') // Remove apostrophes
    .replace(/[^\w\s]/g, ' ') // Replace other punctuation with space
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();

  return normalized;
}

/**
 * Calculate Levenshtein distance between two strings.
 * Uses dynamic programming approach.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array to store distances
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate Levenshtein similarity (0-1) between two strings.
 * Returns 1 for identical strings, 0 for completely different.
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  return 1 - (distance / maxLength);
}

/**
 * Normalize TGO distance to kilometers.
 * TGO distance units are inconsistent:
 * - Values < 50 are likely already in km
 * - Large values with no/short decimals are likely meters
 */
export function normalizeTgoDistanceToKm(tgoDistance: number): number {
  // Values less than 50 are likely already in km
  if (tgoDistance < 50) {
    return tgoDistance;
  }

  // Check decimal precision for larger values
  const str = tgoDistance.toString();
  const decimalPart = str.split('.')[1] || '';

  // Large values with no/short decimals are likely meters
  if (decimalPart.length <= 1 && tgoDistance > 50) {
    return tgoDistance / 1000;
  }

  return tgoDistance;
}

/**
 * Calculate match score for a Google Place candidate.
 * Score = Name Similarity (40%) + Distance Consistency (35%) + Neighborhood Match (25%)
 *
 * @returns Score from 0-100
 */
export function calculateMatchScore(
  candidate: GooglePlaceCandidate,
  tgoName: string,
  tgoNeighborhood: string,
  tgoDistance: number,
  userLocation: GeoPoint
): number {
  // 1. Name similarity (40%)
  const normalizedTgoName = normalizeRestaurantName(tgoName);
  const normalizedGoogleName = normalizeRestaurantName(candidate.displayName.text);

  // Use Levenshtein similarity, but also check if one contains the other
  let nameSimilarity = calculateLevenshteinSimilarity(normalizedTgoName, normalizedGoogleName);

  // Boost score if TGO name is contained in Google name or vice versa
  if (normalizedGoogleName.includes(normalizedTgoName) || normalizedTgoName.includes(normalizedGoogleName)) {
    nameSimilarity = Math.max(nameSimilarity, 0.85);
  }

  // Also check without spaces (handles "Pizza Bulls" vs "Pizzabulls")
  const tgoNoSpaces = normalizedTgoName.replace(/\s+/g, '');
  const googleNoSpaces = normalizedGoogleName.replace(/\s+/g, '');
  if (googleNoSpaces.includes(tgoNoSpaces) || tgoNoSpaces.includes(googleNoSpaces)) {
    nameSimilarity = Math.max(nameSimilarity, 0.85);
  }

  // 2. Distance consistency (35%)
  // Calculate Google's distance from user
  const googleDistanceKm = haversineDistance(userLocation, candidate.location);
  // Normalize TGO distance to km
  const tgoDistanceKm = normalizeTgoDistanceToKm(tgoDistance);
  // Calculate how consistent the distances are (allow for some variance)
  const distanceDiff = Math.abs(googleDistanceKm - tgoDistanceKm);
  // If difference is less than 1km, full score; up to 3km, partial; beyond 3km, low score
  const distanceConsistency = distanceDiff < 1 ? 1 : distanceDiff < 3 ? 1 - ((distanceDiff - 1) / 2) : 0;

  // 3. Neighborhood match (25%)
  // Check if Google address contains the TGO neighborhood name
  const normalizedNeighborhood = normalizeRestaurantName(tgoNeighborhood);
  const normalizedAddress = normalizeRestaurantName(candidate.formattedAddress);
  const neighborhoodMatch = normalizedAddress.includes(normalizedNeighborhood) ? 1 : 0;

  // Calculate weighted score
  const score = (nameSimilarity * 0.40) + (distanceConsistency * 0.35) + (neighborhoodMatch * 0.25);

  return Math.round(score * 100);
}
