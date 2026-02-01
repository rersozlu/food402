// remote/src/session/types.ts - Session type definitions

export interface UserSession {
  // Session identification
  id: string;
  userId: string;

  // Encrypted TGO credentials (AES-256-GCM)
  encryptedEmail: string;
  encryptedPassword: string;
  encryptionIv: string;  // Base64 encoded IV for email
  encryptionIvPassword?: string;  // Base64 encoded IV for password (separate for security)

  // Cached TGO authentication
  tgoToken?: string;
  tgoTokenExpiry?: number;  // Unix timestamp in milliseconds

  // OAuth tokens
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiry: number;  // Unix timestamp in milliseconds

  // Session metadata
  createdAt: number;
  lastUsedAt: number;

  // Selected delivery address (persisted between requests)
  selectedAddressId?: number;
  selectedLatitude?: string;
  selectedLongitude?: string;
}

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  name: string;
  createdAt: number;
}

export interface OAuthAuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  userId: string;
  sessionId: string;
  expiresAt: number;
  codeChallenge?: string;
  codeChallengeMethod?: "plain" | "S256";
}

export interface ThreeDSecurePage {
  id: string;
  sessionId: string;
  htmlContent: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// Cloudflare bindings interface
export interface Env {
  // KV namespaces
  SESSIONS: KVNamespace;
  THREEDS_PAGES: KVNamespace;
  OAUTH_CLIENTS: KVNamespace;

  // Secrets
  ENCRYPTION_KEY: string;  // 32-byte hex for AES-256
  JWT_SECRET: string;      // For signing OAuth tokens

  // Variables
  ENVIRONMENT: string;
}
