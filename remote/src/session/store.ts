// remote/src/session/store.ts - KV-backed session management

import type { UserSession, OAuthClient, OAuthAuthorizationCode, ThreeDSecurePage, Env } from "./types.js";

// Session TTL: 30 days in seconds
const SESSION_TTL = 30 * 24 * 60 * 60;

// Auth code TTL: 10 minutes in seconds
const AUTH_CODE_TTL = 10 * 60;

// 3DS page TTL: 15 minutes in seconds
const THREEDS_TTL = 15 * 60;

export class SessionStore {
  constructor(private env: Env) {}

  // === Session Management ===

  async createSession(session: UserSession): Promise<void> {
    const key = `session:${session.id}`;
    await this.env.SESSIONS.put(key, JSON.stringify(session), {
      expirationTtl: SESSION_TTL,
    });

    // Also index by user ID for lookup
    const userKey = `user:${session.userId}:session`;
    await this.env.SESSIONS.put(userKey, session.id, {
      expirationTtl: SESSION_TTL,
    });
  }

  // Helper for raw KV read (no expiry check, no update)
  private async getRawSession(sessionId: string): Promise<UserSession | null> {
    const key = `session:${sessionId}`;
    const data = await this.env.SESSIONS.get(key);
    if (!data) return null;
    return JSON.parse(data) as UserSession;
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    const session = await this.getRawSession(sessionId);
    if (!session) return null;

    // Check hard expiry (Fix 3: Fixed session expiry)
    if (session.sessionExpiresAt && Date.now() > session.sessionExpiresAt) {
      await this.deleteSessionById(sessionId, session); // Pass session - no extra read
      return null;
    }

    // Update last used timestamp
    session.lastUsedAt = Date.now();
    await this.updateSession(session);

    return session;
  }

  // Read session without updating TTL (Fix 6: Lazy session update)
  // Used during refresh token validation to avoid resetting TTL before validation passes
  async getSessionWithoutUpdate(sessionId: string): Promise<UserSession | null> {
    const session = await this.getRawSession(sessionId);
    if (!session) return null;

    // Check hard expiry (Fix 3: Fixed session expiry)
    if (session.sessionExpiresAt && Date.now() > session.sessionExpiresAt) {
      await this.deleteSessionById(sessionId, session); // Pass session - no extra read
      return null;
    }

    return session;
  }

  async getSessionByUserId(userId: string): Promise<UserSession | null> {
    const userKey = `user:${userId}:session`;
    const sessionId = await this.env.SESSIONS.get(userKey);
    if (!sessionId) return null;

    return this.getSession(sessionId);
  }

  async getSessionByAccessToken(accessToken: string): Promise<UserSession | null> {
    // Index by access token for quick lookup
    const tokenKey = `token:${accessToken}`;
    const sessionId = await this.env.SESSIONS.get(tokenKey);
    if (!sessionId) return null;

    return this.getSession(sessionId);
  }

  async updateSession(session: UserSession): Promise<void> {
    const key = `session:${session.id}`;
    await this.env.SESSIONS.put(key, JSON.stringify(session), {
      expirationTtl: SESSION_TTL,
    });
  }

  // Bug Fix A: Helper that accepts optional pre-parsed session to avoid extra KV read
  // Called by getSession/getSessionWithoutUpdate when session is already parsed
  private async deleteSessionById(sessionId: string, session?: UserSession): Promise<void> {
    const existing = session ?? await this.getRawSession(sessionId);
    if (!existing) return;

    await this.env.SESSIONS.delete(`session:${sessionId}`);
    await this.env.SESSIONS.delete(`user:${existing.userId}:session`);
    if (existing.accessToken) {
      await this.env.SESSIONS.delete(`token:${existing.accessToken}`);
    }
    if (existing.refreshToken) {
      await this.env.SESSIONS.delete(`refresh:${existing.refreshToken}`);
    }
  }

  // Public API for deleting sessions
  async deleteSession(sessionId: string): Promise<void> {
    await this.deleteSessionById(sessionId);
  }

  async indexSessionByToken(sessionId: string, accessToken: string): Promise<void> {
    const tokenKey = `token:${accessToken}`;
    await this.env.SESSIONS.put(tokenKey, sessionId, {
      expirationTtl: SESSION_TTL,
    });
  }

  // Delete access token index (Fix 4: cleanup during rotation)
  async deleteTokenIndex(accessToken: string): Promise<void> {
    const key = `token:${accessToken}`;
    await this.env.SESSIONS.delete(key);
  }

  // Index session by refresh token for lookup
  async indexSessionByRefreshToken(sessionId: string, refreshToken: string): Promise<void> {
    const key = `refresh:${refreshToken}`;
    await this.env.SESSIONS.put(key, sessionId, {
      expirationTtl: SESSION_TTL,
    });
  }

  // Look up session by refresh token (Fix 6: uses non-updating read)
  // Avoids resetting TTL before refresh token validation passes
  async getSessionByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    const key = `refresh:${refreshToken}`;
    const sessionId = await this.env.SESSIONS.get(key);
    if (!sessionId) return null;
    return this.getSessionWithoutUpdate(sessionId);
  }

  // Delete refresh token index (for rotation)
  async deleteRefreshTokenIndex(refreshToken: string): Promise<void> {
    const key = `refresh:${refreshToken}`;
    await this.env.SESSIONS.delete(key);
  }

  // === OAuth Client Management ===

  async registerClient(client: OAuthClient): Promise<void> {
    const key = `client:${client.clientId}`;
    await this.env.OAUTH_CLIENTS.put(key, JSON.stringify(client));
  }

  async getClient(clientId: string): Promise<OAuthClient | null> {
    const key = `client:${clientId}`;
    const data = await this.env.OAUTH_CLIENTS.get(key);
    if (!data) return null;
    return JSON.parse(data) as OAuthClient;
  }

  // === Authorization Code Management ===

  async storeAuthCode(authCode: OAuthAuthorizationCode): Promise<void> {
    const key = `authcode:${authCode.code}`;
    await this.env.SESSIONS.put(key, JSON.stringify(authCode), {
      expirationTtl: AUTH_CODE_TTL,
    });
  }

  async getAuthCode(code: string): Promise<OAuthAuthorizationCode | null> {
    const key = `authcode:${code}`;
    const data = await this.env.SESSIONS.get(key);
    if (!data) return null;
    return JSON.parse(data) as OAuthAuthorizationCode;
  }

  async deleteAuthCode(code: string): Promise<void> {
    const key = `authcode:${code}`;
    await this.env.SESSIONS.delete(key);
  }

  // === 3D Secure Page Management ===

  async store3DSPage(page: ThreeDSecurePage): Promise<void> {
    const key = `3ds:${page.id}`;
    await this.env.THREEDS_PAGES.put(key, JSON.stringify(page), {
      expirationTtl: THREEDS_TTL,
    });
  }

  async get3DSPage(pageId: string): Promise<ThreeDSecurePage | null> {
    const key = `3ds:${pageId}`;
    const data = await this.env.THREEDS_PAGES.get(key);
    if (!data) return null;
    return JSON.parse(data) as ThreeDSecurePage;
  }

  async mark3DSPageUsed(pageId: string): Promise<void> {
    const page = await this.get3DSPage(pageId);
    if (page) {
      page.used = true;
      const key = `3ds:${pageId}`;
      // Set short TTL after use (1 minute for any redirects)
      await this.env.THREEDS_PAGES.put(key, JSON.stringify(page), {
        expirationTtl: 60,
      });
    }
  }

  async delete3DSPage(pageId: string): Promise<void> {
    const key = `3ds:${pageId}`;
    await this.env.THREEDS_PAGES.delete(key);
  }
}
