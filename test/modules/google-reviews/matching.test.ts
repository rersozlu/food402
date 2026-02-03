import { describe, it, expect } from "vitest";
import {
  normalizeRestaurantName,
  calculateLevenshteinSimilarity,
  normalizeTgoDistanceToKm,
  calculateMatchScore,
} from "../../../shared/modules/google-reviews/matching.js";
import type { GooglePlaceCandidate } from "../../../shared/modules/google-reviews/types.js";

describe("normalizeTgoDistanceToKm", () => {
  describe("values already in km", () => {
    it("should keep small values as km", () => {
      expect(normalizeTgoDistanceToKm(0.5)).toBe(0.5);
      expect(normalizeTgoDistanceToKm(1.2)).toBe(1.2);
      expect(normalizeTgoDistanceToKm(5)).toBe(5);
      expect(normalizeTgoDistanceToKm(10)).toBe(10);
      expect(normalizeTgoDistanceToKm(49)).toBe(49);
    });

    it("should handle values with decimal precision", () => {
      expect(normalizeTgoDistanceToKm(0.123)).toBe(0.123);
      expect(normalizeTgoDistanceToKm(2.567)).toBe(2.567);
    });
  });

  describe("values in meters", () => {
    it("should convert large integer values to km", () => {
      expect(normalizeTgoDistanceToKm(500)).toBe(0.5);
      expect(normalizeTgoDistanceToKm(1000)).toBe(1);
      expect(normalizeTgoDistanceToKm(1500)).toBe(1.5);
      expect(normalizeTgoDistanceToKm(2500)).toBe(2.5);
    });

    it("should convert values > 50 with no/short decimals to km", () => {
      // Values > 50 with no decimals are treated as meters
      expect(normalizeTgoDistanceToKm(100)).toBe(0.1);
      expect(normalizeTgoDistanceToKm(200)).toBe(0.2);
      expect(normalizeTgoDistanceToKm(51)).toBe(0.051);
    });
  });

  describe("edge cases around 50 boundary", () => {
    it("should treat values < 50 as km", () => {
      expect(normalizeTgoDistanceToKm(49)).toBe(49);
      expect(normalizeTgoDistanceToKm(49.9)).toBe(49.9);
      expect(normalizeTgoDistanceToKm(10)).toBe(10);
    });

    it("should treat exactly 50 as km (threshold behavior)", () => {
      // 50 is not > 50, so it's treated as km
      expect(normalizeTgoDistanceToKm(50)).toBe(50);
    });

    it("should use decimal length to determine unit for values > 50", () => {
      // Single decimal or no decimal: meters
      expect(normalizeTgoDistanceToKm(75)).toBe(0.075);
      expect(normalizeTgoDistanceToKm(75.5)).toBe(0.0755);

      // Multiple decimal places: km
      expect(normalizeTgoDistanceToKm(75.55)).toBe(75.55);
      expect(normalizeTgoDistanceToKm(75.555)).toBe(75.555);
    });
  });

  describe("real-world TGO distance examples", () => {
    it("should handle typical TGO distance values", () => {
      // Typical km values from TGO
      expect(normalizeTgoDistanceToKm(0.3)).toBe(0.3);
      expect(normalizeTgoDistanceToKm(1.5)).toBe(1.5);
      expect(normalizeTgoDistanceToKm(3.2)).toBe(3.2);

      // Typical meter values from TGO
      expect(normalizeTgoDistanceToKm(300)).toBe(0.3);
      expect(normalizeTgoDistanceToKm(1500)).toBe(1.5);
      expect(normalizeTgoDistanceToKm(3200)).toBe(3.2);
    });
  });
});

describe("normalizeRestaurantName (additional tests)", () => {
  it("should remove parenthetical location suffixes", () => {
    expect(normalizeRestaurantName("McDonald's (Beytepe)")).toBe("mcdonalds");
    expect(normalizeRestaurantName("Burger King (Çayyolu)")).toBe("burger king");
  });

  it("should remove dash-separated location suffixes", () => {
    expect(normalizeRestaurantName("McDonald's - Çankaya")).toBe("mcdonalds");
    expect(normalizeRestaurantName("Starbucks - Kızılay")).toBe("starbucks");
  });

  it("should handle combined Turkish chars and suffixes", () => {
    expect(normalizeRestaurantName("Şeref Usta Kebap (Merkez)")).toBe("seref usta");
    expect(normalizeRestaurantName("Güneş Döner Restoran")).toBe("gunes doner");
  });
});

describe("calculateLevenshteinSimilarity (additional tests)", () => {
  it("should handle restaurant name variations", () => {
    // With/without apostrophe
    const withApostrophe = "mcdonalds";
    const variations = ["mcdonalds", "mcdonald", "mcdonalds1"];

    expect(calculateLevenshteinSimilarity(withApostrophe, variations[0])).toBe(1);
    expect(calculateLevenshteinSimilarity(withApostrophe, variations[1])).toBeGreaterThan(0.8);
    expect(calculateLevenshteinSimilarity(withApostrophe, variations[2])).toBeGreaterThan(0.8);
  });

  it("should give low similarity for completely different names", () => {
    expect(calculateLevenshteinSimilarity("mcdonalds", "burgerking")).toBeLessThan(0.5);
    expect(calculateLevenshteinSimilarity("pizza hut", "taco bell")).toBeLessThan(0.5);
  });
});

describe("calculateMatchScore (additional tests)", () => {
  const userLocation = { latitude: 41.0082, longitude: 28.9784 };

  it("should use normalized distance for scoring", () => {
    const candidate: GooglePlaceCandidate = {
      id: "place_123",
      displayName: { text: "McDonald's" },
      formattedAddress: "Kadıköy, Istanbul, Turkey",
      location: { latitude: 41.0092, longitude: 28.9794 }, // ~0.15km away
    };

    // Test with TGO distance in meters (should be normalized to km)
    const scoreWithMeters = calculateMatchScore(
      candidate,
      "McDonald's",
      "Kadıköy",
      150, // 150 meters (will be normalized to 0.15km)
      userLocation
    );

    // Test with TGO distance in km
    const scoreWithKm = calculateMatchScore(
      candidate,
      "McDonald's",
      "Kadıköy",
      0.15, // 0.15km
      userLocation
    );

    // Both should give similar high scores since distances are equivalent
    expect(scoreWithMeters).toBeGreaterThanOrEqual(70);
    expect(scoreWithKm).toBeGreaterThanOrEqual(70);
    // The scores should be close (within a few points due to the normalization)
    expect(Math.abs(scoreWithMeters - scoreWithKm)).toBeLessThan(10);
  });

  it("should handle edge case distances around 50", () => {
    const candidate: GooglePlaceCandidate = {
      id: "place_edge",
      displayName: { text: "Test Restaurant" },
      formattedAddress: "Kadıköy, Istanbul, Turkey",
      // Located ~0.5km from user
      location: { latitude: 41.0127, longitude: 28.9784 },
    };

    // 500 meters = 0.5km (clearly in meters range)
    const score = calculateMatchScore(
      candidate,
      "Test Restaurant",
      "Kadıköy",
      500, // 500 meters = 0.5km
      userLocation
    );

    expect(score).toBeGreaterThanOrEqual(70);
  });
});
