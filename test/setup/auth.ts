// test/setup/auth.ts - Shared authentication setup for tests
import { validateEnv } from "./env.js";

// Ensure env is loaded before importing auth module
validateEnv();

// Import auth module after env validation
import { getToken, login } from "../../src/auth.js";

let cachedTestToken: string | null = null;

/**
 * Get a valid authentication token for tests.
 * Caches the token across test files to reduce API calls.
 */
export async function getTestToken(): Promise<string> {
  if (cachedTestToken) {
    return cachedTestToken;
  }

  cachedTestToken = await getToken();
  return cachedTestToken;
}

/**
 * Force a fresh login for tests that need it.
 */
export async function forceLogin(): Promise<string> {
  cachedTestToken = await login();
  return cachedTestToken;
}

/**
 * Clear the cached token (useful for cleanup).
 */
export function clearTokenCache(): void {
  cachedTestToken = null;
}
