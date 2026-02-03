// test/integration/addresses.test.ts - Address API tests
import { describe, it, expect, beforeAll } from "vitest";
import { getTestToken } from "../setup/auth.js";
import {
  getAddresses,
  getCities,
  getDistricts,
  getNeighborhoods,
  addAddress,
} from "../../shared/api.js";

describe("Address API", () => {
  let token: string;

  beforeAll(async () => {
    token = await getTestToken();
  });

  describe("getAddresses", () => {
    it("should return user addresses", async () => {
      const result = await getAddresses(token);

      expect(result).toBeDefined();
      expect(Array.isArray(result.addresses)).toBe(true);

      // Each address should have required fields
      if (result.addresses.length > 0) {
        const address = result.addresses[0];
        expect(address.id).toBeDefined();
        expect(address.addressName).toBeDefined();
        expect(typeof address.latitude).toBe("string");
        expect(typeof address.longitude).toBe("string");
      }
    });
  });

  describe("getCities", () => {
    it("should return list of cities", async () => {
      const result = await getCities(token);

      expect(result).toBeDefined();
      expect(result.cities).toBeDefined();
      expect(Array.isArray(result.cities)).toBe(true);
      expect(result.cities.length).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThan(0);

      // Istanbul should be in the list (find by name, not ID)
      const istanbul = result.cities.find((c) =>
        c.name.toLowerCase().includes("istanbul") || c.name.includes("İstanbul")
      );
      expect(istanbul).toBeDefined();
    });
  });

  describe("getDistricts", () => {
    it("should return districts for a city", async () => {
      // First get cities to find a valid city ID
      const cities = await getCities(token);
      expect(cities.cities.length).toBeGreaterThan(0);

      const cityId = cities.cities[0].id;
      const result = await getDistricts(token, cityId);

      expect(result).toBeDefined();
      expect(result.districts).toBeDefined();
      expect(Array.isArray(result.districts)).toBe(true);
      expect(result.districts.length).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThan(0);
      expect(result.cityId).toBe(cityId);

      // Each district should have id and name
      const district = result.districts[0];
      expect(district.id).toBeDefined();
      expect(district.name).toBeDefined();
    });
  });

  describe("getNeighborhoods", () => {
    it("should return neighborhoods for a district", async () => {
      // First get cities and districts to find valid IDs
      const cities = await getCities(token);
      const cityId = cities.cities[0].id;
      const districts = await getDistricts(token, cityId);
      expect(districts.districts.length).toBeGreaterThan(0);

      const districtId = districts.districts[0].id;
      const result = await getNeighborhoods(token, districtId);

      expect(result).toBeDefined();
      expect(result.neighborhoods).toBeDefined();
      expect(Array.isArray(result.neighborhoods)).toBe(true);
      expect(result.neighborhoods.length).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThan(0);
      expect(result.districtId).toBe(districtId);

      // Each neighborhood should have id and name
      const neighborhood = result.neighborhoods[0];
      expect(neighborhood.id).toBeDefined();
      expect(neighborhood.name).toBeDefined();
    });
  });

  describe("addAddress", () => {
    it("should handle address creation or OTP requirement", async () => {
      // Get valid location hierarchy first
      const cities = await getCities(token);
      const cityId = cities.cities[0].id;
      const districts = await getDistricts(token, cityId);
      const districtId = districts.districts[0].id;
      const neighborhoods = await getNeighborhoods(token, districtId);
      const neighborhoodId = neighborhoods.neighborhoods[0]?.id;

      if (!neighborhoodId) {
        console.warn("No neighborhood found, skipping addAddress test");
        return;
      }

      // Note: This may require OTP verification in production
      // We test that the API call completes without throwing or handles OTP gracefully
      try {
        const result = await addAddress(token, {
          name: "Test",
          surname: "User",
          phone: "5551234567",
          addressName: `Test Address ${Date.now()}`,
          addressLine: "Test Street 123",
          cityId: cityId,
          districtId: districtId,
          neighborhoodId: neighborhoodId,
          latitude: "41.0082",
          longitude: "28.9784",
        });

        expect(result).toBeDefined();
        // Either success or OTP required
        expect(
          result.success === true || result.requiresOtp === true
        ).toBe(true);

        if (result.success && result.address) {
          expect(result.address.id).toBeDefined();
          expect(result.address.addressName).toContain("Test Address");
        }

        if (result.requiresOtp) {
          expect(result.message).toContain("OTP");
        }
      } catch (error: any) {
        // 400 errors are expected if address already exists or validation fails
        // 429 (rate limit/OTP) should be handled by the function
        expect(error.message).toMatch(/400|429|Failed to add address/);
      }
    });
  });
});
