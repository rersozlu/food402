// remote/src/auth/tgo-auth.ts - Multi-user TGO authentication

import { decrypt, type EncryptedData } from "./crypto.js";
import type { UserSession, Env } from "../session/types.js";
import { SessionStore } from "../session/store.js";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

/**
 * Custom error class for TGO authentication failures
 */
export class TGOAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TGOAuthenticationError";
  }
}

/**
 * Parse a specific cookie from Set-Cookie header
 */
function parseCookie(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;

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

    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/**
 * Authenticate with TGO Yemek and get JWT token
 */
export async function authenticateWithTGO(
  email: string,
  password: string
): Promise<{ token: string; expiry: number }> {
  // Step 1: Get CSRF token
  const csrfResponse = await fetch("https://tgoyemek.com/api/auth/csrf", {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!csrfResponse.ok) {
    throw new TGOAuthenticationError(
      `Failed to fetch CSRF token: ${csrfResponse.status} ${csrfResponse.statusText}`
    );
  }

  const csrfToken = parseCookie(
    csrfResponse.headers.get("set-cookie"),
    "tgo-csrf-token"
  );

  if (!csrfToken) {
    throw new TGOAuthenticationError("CSRF token not found in response");
  }

  // Step 2: Login with credentials
  const loginResponse = await fetch("https://tgoyemek.com/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      Cookie: `tgo-csrf-token=${csrfToken}`,
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      username: email,
      password: password,
      csrfToken: csrfToken,
    }),
  });

  if (!loginResponse.ok) {
    throw new TGOAuthenticationError(
      `Login failed: ${loginResponse.status} ${loginResponse.statusText}`
    );
  }

  // Step 3: Extract tgo-token from response
  const token = parseCookie(
    loginResponse.headers.get("set-cookie"),
    "tgo-token"
  );

  if (!token) {
    throw new TGOAuthenticationError(
      "Authentication token not found in login response"
    );
  }

  return {
    token,
    expiry: getTokenExpiry(token),
  };
}

/**
 * Get a valid TGO token for a session, refreshing if needed
 */
export async function getTGOToken(
  session: UserSession,
  env: Env
): Promise<string> {
  const store = new SessionStore(env);

  // Check if we have a cached token that's still valid
  if (session.tgoToken && session.tgoTokenExpiry) {
    // Add 60-second buffer before expiry
    if (Date.now() < session.tgoTokenExpiry - 60000) {
      return session.tgoToken;
    }
  }

  // Need to refresh - decrypt credentials
  const encryptedEmail: EncryptedData = {
    ciphertext: session.encryptedEmail,
    iv: session.encryptionIv,
  };
  const encryptedPassword: EncryptedData = {
    ciphertext: session.encryptedPassword,
    // Use separate IV for password if available, fallback to email IV for backwards compatibility
    iv: session.encryptionIvPassword || session.encryptionIv,
  };

  const email = await decrypt(encryptedEmail, env.ENCRYPTION_KEY);
  const password = await decrypt(encryptedPassword, env.ENCRYPTION_KEY);

  // Authenticate with TGO
  const { token, expiry } = await authenticateWithTGO(email, password);

  // Update session with new token
  session.tgoToken = token;
  session.tgoTokenExpiry = expiry;
  await store.updateSession(session);

  return token;
}

/**
 * Validate TGO credentials by attempting to authenticate
 */
export async function validateTGOCredentials(
  email: string,
  password: string
): Promise<boolean> {
  try {
    await authenticateWithTGO(email, password);
    return true;
  } catch {
    return false;
  }
}
