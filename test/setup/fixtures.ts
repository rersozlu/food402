// test/setup/fixtures.ts - Test fixtures and helpers

// Istanbul coordinates (central location with many restaurants)
export const ISTANBUL_COORDS = {
  latitude: "41.0082",
  longitude: "28.9784",
};

// Alternative coordinates for testing
export const ANKARA_COORDS = {
  latitude: "39.9334",
  longitude: "32.8597",
};

// Known city/district IDs for Istanbul (for address tests)
export const ISTANBUL_LOCATION = {
  cityId: 34, // Istanbul
  districtId: 442, // Kadikoy (a popular district)
};

/**
 * Retry helper for flaky API calls.
 * Retries the function up to maxRetries times with exponential backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep for a specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique test identifier for isolation.
 */
export function uniqueId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Test data for address creation (safe values that won't OTP-lock).
 */
export const TEST_ADDRESS_DATA = {
  name: "Test",
  surname: "User",
  phone: "5551234567",
  addressName: "Test Address",
  addressLine: "Test Street 123",
};
