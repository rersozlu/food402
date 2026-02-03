// Manual test script for restaurant sorting/filtering.
// Usage: npx tsx scripts/test-restaurant-sorting.ts [--address-index N] [--min-basket-price N] [--page N] [--limit N] [--lat LAT --lng LNG] [--sort SORT]

import { getAddresses, getRestaurants } from "../src/api.js";

const SORT_TYPES = ["RECOMMENDED", "RESTAURANT_SCORE", "RESTAURANT_DISTANCE"] as const;
type RestaurantSortType = (typeof SORT_TYPES)[number];

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function resolveCoordinates(): Promise<{ latitude: string; longitude: string; label: string }> {
  const latArg = getArgValue("--lat");
  const lngArg = getArgValue("--lng");

  if (latArg && lngArg) {
    return { latitude: latArg, longitude: lngArg, label: "CLI coordinates" };
  }

  const addresses = await getAddresses();
  if (!addresses.addresses.length) {
    throw new Error("No saved addresses found. Add an address or pass --lat and --lng.");
  }

  const addressIndex = toNumber(getArgValue("--address-index")) ?? 0;
  const address = addresses.addresses[addressIndex];
  if (!address) {
    throw new Error(`Address index ${addressIndex} is out of range. Available: 0-${addresses.addresses.length - 1}`);
  }

  return {
    latitude: address.latitude,
    longitude: address.longitude,
    label: `${address.addressName} (${address.cityName})`,
  };
}

function pickSortTypes(): RestaurantSortType[] {
  const sortArg = getArgValue("--sort");
  if (!sortArg) return [...SORT_TYPES];

  if (!SORT_TYPES.includes(sortArg as RestaurantSortType)) {
    throw new Error(`Invalid --sort value: ${sortArg}. Use one of: ${SORT_TYPES.join(", ")}`);
  }

  return [sortArg as RestaurantSortType];
}

async function main() {
  const page = toNumber(getArgValue("--page")) ?? 1;
  const limit = toNumber(getArgValue("--limit")) ?? 5;
  const minBasketPrice = toNumber(getArgValue("--min-basket-price"));
  const { latitude, longitude, label } = await resolveCoordinates();
  const sortTypes = pickSortTypes();

  console.log(`Using location: ${label}`);
  console.log(`Latitude: ${latitude}`);
  console.log(`Longitude: ${longitude}`);
  if (minBasketPrice !== undefined) {
    console.log(`minBasketPrice filter: ${minBasketPrice}`);
  }

  for (const sortType of sortTypes) {
    const result = await getRestaurants(latitude, longitude, page, sortType, minBasketPrice);
    console.log("");
    console.log(`[${sortType}] returned ${result.restaurants.length} restaurants (page ${result.currentPage}, total ${result.totalCount})`);

    const preview = result.restaurants.slice(0, limit);
    preview.forEach((restaurant, index) => {
      const name = restaurant.name;
      const rating = restaurant.ratingText || restaurant.rating.toString();
      const distance = Number.isFinite(restaurant.distance) ? `${restaurant.distance} km` : "n/a";
      const minPrice = Number.isFinite(restaurant.minBasketPrice) ? `${restaurant.minBasketPrice} TL` : "n/a";
      console.log(`${index + 1}. ${name} | rating: ${rating} | distance: ${distance} | minBasketPrice: ${minPrice}`);
    });
  }
}

main().catch((error) => {
  console.error("Test run failed:", error);
  process.exitCode = 1;
});
