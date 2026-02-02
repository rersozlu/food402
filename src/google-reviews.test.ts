import { describe, it, expect } from "vitest";
import {
  normalizeRestaurantName,
  calculateLevenshteinSimilarity,
  haversineDistance,
  calculateMatchScore,
} from "../shared/api.js";

describe("normalizeRestaurantName", () => {
  it("should convert to lowercase", () => {
    expect(normalizeRestaurantName("McDonald's")).toBe("mcdonalds");
  });

  it("should normalize Turkish characters", () => {
    expect(normalizeRestaurantName("Şeref Kebap")).toBe("seref");
    expect(normalizeRestaurantName("Güneş Döner")).toBe("gunes doner");
    expect(normalizeRestaurantName("Köfteci İbrahim")).toBe("kofteci ibrahim");
  });

  it("should remove common suffixes", () => {
    expect(normalizeRestaurantName("Burger King Restaurant")).toBe("burger king");
    expect(normalizeRestaurantName("Ali Usta Kebap")).toBe("ali usta");
    expect(normalizeRestaurantName("Şef Restoran")).toBe("sef");
  });

  it("should handle apostrophes and punctuation", () => {
    expect(normalizeRestaurantName("McDonald's")).toBe("mcdonalds");
    expect(normalizeRestaurantName("Arby's")).toBe("arbys");
    expect(normalizeRestaurantName("Little Caesars Pizza!")).toBe("little caesars pizza");
  });

  it("should normalize whitespace", () => {
    expect(normalizeRestaurantName("  Burger   King  ")).toBe("burger king");
  });
});

describe("calculateLevenshteinSimilarity", () => {
  it("should return 1 for identical strings", () => {
    expect(calculateLevenshteinSimilarity("mcdonalds", "mcdonalds")).toBe(1);
  });

  it("should return 0 for completely different strings of same length", () => {
    expect(calculateLevenshteinSimilarity("abc", "xyz")).toBe(0);
  });

  it("should handle empty strings", () => {
    expect(calculateLevenshteinSimilarity("", "")).toBe(1);
    expect(calculateLevenshteinSimilarity("abc", "")).toBe(0);
    expect(calculateLevenshteinSimilarity("", "abc")).toBe(0);
  });

  it("should calculate partial similarity correctly", () => {
    // "mcdonalds" vs "mcdonals" (missing 'd') - 1 edit out of 9 chars
    const similarity = calculateLevenshteinSimilarity("mcdonalds", "mcdonals");
    expect(similarity).toBeCloseTo(8 / 9, 2);
  });

  it("should handle name variations", () => {
    const similarity = calculateLevenshteinSimilarity("burger king", "burgerking");
    expect(similarity).toBeGreaterThan(0.8);
  });
});

describe("haversineDistance", () => {
  it("should return 0 for same point", () => {
    const point = { latitude: 41.0082, longitude: 28.9784 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it("should calculate distance correctly for known points", () => {
    // Istanbul to Ankara is approximately 350km
    const istanbul = { latitude: 41.0082, longitude: 28.9784 };
    const ankara = { latitude: 39.9334, longitude: 32.8597 };
    const distance = haversineDistance(istanbul, ankara);
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(360);
  });

  it("should calculate short distances correctly", () => {
    // Two points ~1km apart in Istanbul
    const point1 = { latitude: 41.0082, longitude: 28.9784 };
    const point2 = { latitude: 41.0172, longitude: 28.9784 }; // ~1km north
    const distance = haversineDistance(point1, point2);
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.1);
  });
});

describe("calculateMatchScore", () => {
  const userLocation = { latitude: 41.0082, longitude: 28.9784 };

  it("should give high score for exact name match in correct neighborhood", () => {
    const candidate = {
      id: "place_123",
      displayName: { text: "McDonald's" },
      formattedAddress: "Kadıköy, Istanbul, Turkey",
      location: { latitude: 41.0092, longitude: 28.9794 }, // ~0.15km away
    };

    const score = calculateMatchScore(
      candidate,
      "McDonald's",
      "Kadıköy",
      0.15, // TGO says 0.15km
      userLocation
    );

    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("should give low score for different neighborhood", () => {
    const candidate = {
      id: "place_456",
      displayName: { text: "McDonald's" },
      formattedAddress: "Beşiktaş, Istanbul, Turkey", // Different neighborhood
      location: { latitude: 41.0082, longitude: 28.9784 },
    };

    const score = calculateMatchScore(
      candidate,
      "McDonald's",
      "Kadıköy", // TGO says Kadıköy
      0.5, // 0.5km
      userLocation
    );

    // Should lose the 25% neighborhood match (max possible is 75 without neighborhood)
    expect(score).toBeLessThanOrEqual(75);
  });

  it("should give low score for large distance mismatch", () => {
    const candidate = {
      id: "place_789",
      displayName: { text: "McDonald's" },
      formattedAddress: "Kadıköy, Istanbul, Turkey",
      location: { latitude: 41.0582, longitude: 28.9784 }, // ~5.5km away
    };

    const score = calculateMatchScore(
      candidate,
      "McDonald's",
      "Kadıköy",
      0.5, // TGO says 0.5km, but Google says 5.5km
      userLocation
    );

    // Should lose most of the 35% distance score
    expect(score).toBeLessThan(70);
  });

  it("should handle Turkish character variations", () => {
    const candidate = {
      id: "place_turkish",
      displayName: { text: "Seref Kebap" }, // Without Turkish chars
      formattedAddress: "Kadıköy, Istanbul, Turkey",
      location: { latitude: 41.0092, longitude: 28.9794 },
    };

    const score = calculateMatchScore(
      candidate,
      "Şeref Kebap", // With Turkish chars
      "Kadıköy",
      0.15, // 0.15km
      userLocation
    );

    // Should still match due to normalization
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("should reject when score is below 70", () => {
    const candidate = {
      id: "place_wrong",
      displayName: { text: "Burger King" }, // Wrong restaurant
      formattedAddress: "Beşiktaş, Istanbul, Turkey", // Wrong neighborhood
      location: { latitude: 41.1082, longitude: 28.9784 }, // ~11km away
    };

    const score = calculateMatchScore(
      candidate,
      "McDonald's",
      "Kadıköy",
      0.5, // 0.5km
      userLocation
    );

    expect(score).toBeLessThan(70);
  });
});

describe("Branch Matching Integration", () => {
  it("should correctly identify the right McDonald's branch", () => {
    const userLocation = { latitude: 41.0082, longitude: 28.9784 };

    // Simulating two McDonald's candidates
    const correctBranch = {
      id: "correct",
      displayName: { text: "McDonald's Kadıköy" },
      formattedAddress: "Caferağa Mah., Kadıköy, Istanbul",
      location: { latitude: 41.0092, longitude: 28.9794 }, // Close to user
    };

    const wrongBranch = {
      id: "wrong",
      displayName: { text: "McDonald's Beşiktaş" },
      formattedAddress: "Beşiktaş, Istanbul",
      location: { latitude: 41.0432, longitude: 29.0012 }, // Further away
    };

    const correctScore = calculateMatchScore(
      correctBranch,
      "McDonald's",
      "Kadıköy",
      0.15, // 0.15km according to TGO
      userLocation
    );

    const wrongScore = calculateMatchScore(
      wrongBranch,
      "McDonald's",
      "Kadıköy",
      0.15, // 0.15km
      userLocation
    );

    // Correct branch should score higher
    expect(correctScore).toBeGreaterThan(wrongScore);
    expect(correctScore).toBeGreaterThanOrEqual(70);
  });
});
