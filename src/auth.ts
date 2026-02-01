// src/auth.ts - TGO Yemek Authentication Module

import "dotenv/config";

const CREDENTIALS = {
  email: process.env.TGO_EMAIL || "",
  password: process.env.TGO_PASSWORD || ""
};

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Parse a specific cookie from Set-Cookie header
 */
function parseCookie(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;

  // Set-Cookie can have multiple cookies separated by comma (for multiple Set-Cookie headers joined)
  // or be a single cookie with attributes separated by semicolon
  const cookies = setCookieHeader.split(/,(?=\s*[^;]+=[^;]+)/);

  for (const cookie of cookies) {
    const parts = cookie.trim().split(";");
    const [cookieName, ...valueParts] = parts[0].split("=");
    if (cookieName.trim() === name) {
      return valueParts.join("=").trim();
    }
  }
  return null;
}

/**
 * Decode JWT to get expiry timestamp
 */
function getTokenExpiry(token: string): number {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 0;

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    // JWT exp is in seconds, convert to milliseconds
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/**
 * Check if the cached token is still valid
 * Considers token invalid if it expires within 60 seconds
 */
function isTokenValid(): boolean {
  if (!cachedToken) return false;
  // Add 60 second buffer before expiry
  return Date.now() < tokenExpiry - 60000;
}

/**
 * Force a fresh login, bypassing the cache
 */
export async function login(): Promise<string> {
  // Step 1: Get CSRF token
  const csrfResponse = await fetch("https://tgoyemek.com/api/auth/csrf", {
    headers: {
      "User-Agent": USER_AGENT
    }
  });

  if (!csrfResponse.ok) {
    throw new AuthenticationError(`Failed to fetch CSRF token: ${csrfResponse.status} ${csrfResponse.statusText}`);
  }

  const csrfToken = parseCookie(csrfResponse.headers.get("set-cookie"), "tgo-csrf-token");

  if (!csrfToken) {
    throw new AuthenticationError("CSRF token not found in response");
  }

  // Step 2: Login with credentials
  const loginResponse = await fetch("https://tgoyemek.com/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "Cookie": `tgo-csrf-token=${csrfToken}`,
      "User-Agent": USER_AGENT
    },
    body: JSON.stringify({
      username: CREDENTIALS.email,
      password: CREDENTIALS.password,
      csrfToken: csrfToken
    })
  });

  if (!loginResponse.ok) {
    throw new AuthenticationError(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
  }

  // Step 3: Extract tgo-token from response
  const token = parseCookie(loginResponse.headers.get("set-cookie"), "tgo-token");

  if (!token) {
    throw new AuthenticationError("Authentication token not found in login response");
  }

  // Cache the token
  cachedToken = token;
  tokenExpiry = getTokenExpiry(token);

  return token;
}

/**
 * Get a valid authentication token
 * Returns cached token if valid, otherwise performs fresh login
 */
export async function getToken(): Promise<string> {
  if (isTokenValid() && cachedToken) {
    return cachedToken;
  }

  return login();
}
