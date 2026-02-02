// remote/src/auth/oauth-provider.ts - Custom OAuth provider for Claude.ai

import { Hono } from "hono";
import { SignJWT, jwtVerify } from "jose";
import type { Env, UserSession, OAuthAuthorizationCode, OAuthClient } from "../session/types.js";
import { SessionStore } from "../session/store.js";
import { renderLoginPage, renderErrorPage } from "./login-page.js";
import { encrypt, generateUUID, generateRandomHex, verifyPKCE } from "./crypto.js";
import { authenticateWithTGO, validateTGOCredentials, getTGOToken } from "./tgo-auth.js";

// Create OAuth routes
export function createOAuthRoutes() {
  const oauth = new Hono<{ Bindings: Env }>();

  // OAuth 2.0 Server Metadata (RFC 8414)
  oauth.get("/.well-known/oauth-authorization-server", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["plain", "S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
      scopes_supported: ["openid", "profile", "offline_access"],
    });
  });

  // OpenID Connect Discovery 1.0 (for MCP client compatibility)
  oauth.get("/.well-known/openid-configuration", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["plain", "S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
      scopes_supported: ["openid", "profile", "offline_access"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["HS256"],
    });
  });

  // OAuth 2.0 Protected Resource Metadata for /mcp endpoint (RFC 9728)
  oauth.get("/.well-known/oauth-protected-resource/mcp", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
      scopes_supported: ["openid", "profile", "offline_access"],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://github.com/rersozlu/food402",
    });
  });

  // OAuth 2.0 Protected Resource Metadata (RFC 9728)
  oauth.get("/.well-known/oauth-protected-resource", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      resource: baseUrl,
      authorization_servers: [baseUrl],
      scopes_supported: ["openid", "profile", "offline_access"],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://github.com/rersozlu/food402",
    });
  });

  // MCP-specific metadata
  oauth.get("/.well-known/mcp-manifest", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      name: "TGO Yemek Food Ordering",
      version: "1.0.0",
      description: "Order food from TGO Yemek through Claude",
      oauth: {
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        registration_endpoint: `${baseUrl}/oauth/register`,
      },
      mcp: {
        endpoint: `${baseUrl}/mcp`,
        transport: "streamable-http",
      },
    });
  });

  // Dynamic Client Registration (RFC 7591)
  oauth.post("/oauth/register", async (c) => {
    const store = new SessionStore(c.env);
    const body = await c.req.json();

    const clientId = generateUUID();
    const clientSecret = generateRandomHex(32);

    // Require at least one redirect URI for security
    const redirectUris = body.redirect_uris || [];
    if (redirectUris.length === 0) {
      return c.json({
        error: "invalid_client_metadata",
        error_description: "At least one redirect_uri is required",
      }, 400);
    }

    const client: OAuthClient = {
      clientId,
      clientSecret,
      redirectUris,
      name: body.client_name || "Claude.ai",
      createdAt: Date.now(),
    };

    await store.registerClient(client);

    return c.json({
      client_id: clientId,
      client_secret: clientSecret,
      client_name: client.name,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: "client_secret_post",
    });
  });

  // Authorization endpoint - shows login page
  oauth.get("/oauth/authorize", async (c) => {
    const store = new SessionStore(c.env);

    const clientId = c.req.query("client_id");
    const redirectUri = c.req.query("redirect_uri");
    const responseType = c.req.query("response_type");
    const state = c.req.query("state") || "";
    const codeChallenge = c.req.query("code_challenge");
    const codeChallengeMethod = c.req.query("code_challenge_method");
    const resource = c.req.query("resource");

    if (resource) {
      const baseUrl = new URL(c.req.url).origin;
      if (!resource.startsWith(baseUrl)) {
        return c.html(
          renderErrorPage("Invalid Request", "Invalid resource parameter."),
          400
        );
      }
    }

    // Validate required parameters
    if (!clientId || !redirectUri || responseType !== "code") {
      return c.html(
        renderErrorPage(
          "Invalid Request",
          "Missing or invalid OAuth parameters."
        ),
        400
      );
    }

    // Validate client
    const client = await store.getClient(clientId);
    if (!client) {
      return c.html(
        renderErrorPage("Invalid Client", "Unknown client_id."),
        400
      );
    }

    // Validate redirect URI (always required since clients must have at least one)
    if (!client.redirectUris.includes(redirectUri)) {
      return c.html(
        renderErrorPage("Invalid Redirect URI", "The redirect_uri is not registered."),
        400
      );
    }

    // Show login page
    return c.html(
      renderLoginPage({
        clientId,
        redirectUri,
        state,
        resource: resource || undefined,
        codeChallenge,
        codeChallengeMethod,
      })
    );
  });

  // Login form submission
  oauth.post("/oauth/login", async (c) => {
    const store = new SessionStore(c.env);
    const formData = await c.req.formData();

    const clientId = formData.get("client_id") as string;
    const redirectUri = formData.get("redirect_uri") as string;
    const state = formData.get("state") as string;
    const codeChallenge = formData.get("code_challenge") as string | null;
    const codeChallengeMethod = (formData.get("code_challenge_method") as "plain" | "S256") || "plain";
    const resource = formData.get("resource") as string | null;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (resource) {
      const baseUrl = new URL(c.req.url).origin;
      if (!resource.startsWith(baseUrl)) {
        return c.html(
          renderErrorPage("Invalid Request", "Invalid resource parameter."),
          400
        );
      }
    }

    // Validate client
    const client = await store.getClient(clientId);
    if (!client) {
      return c.html(
        renderErrorPage("Invalid Client", "Unknown client_id."),
        400
      );
    }

    // Validate TGO credentials
    try {
      const { token: tgoToken, expiry: tgoExpiry } = await authenticateWithTGO(email, password);

      // Create user session
      const sessionId = generateUUID();
      const userId = generateUUID();
      const accessToken = generateRandomHex(32);

      // Encrypt credentials with separate IVs for security
      const encryptedEmail = await encrypt(email, c.env.ENCRYPTION_KEY);
      const encryptedPassword = await encrypt(password, c.env.ENCRYPTION_KEY);

      const session: UserSession = {
        id: sessionId,
        userId,
        encryptedEmail: encryptedEmail.ciphertext,
        encryptedPassword: encryptedPassword.ciphertext,
        encryptionIv: encryptedEmail.iv,
        encryptionIvPassword: encryptedPassword.iv,
        tgoToken,
        tgoTokenExpiry: tgoExpiry,
        accessToken,
        accessTokenExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        clientId,  // Fix 2: Client binding
        sessionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,  // Fix 3: Fixed 30-day expiry
      };

      await store.createSession(session);
      await store.indexSessionByToken(sessionId, accessToken);

      // Create authorization code
      const code = generateRandomHex(32);
      const authCode: OAuthAuthorizationCode = {
        code,
        clientId,
        redirectUri,
        userId,
        sessionId,
        resource: resource || undefined,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        codeChallenge: codeChallenge || undefined,
        codeChallengeMethod: codeChallenge ? codeChallengeMethod : undefined,
      };

      await store.storeAuthCode(authCode);

      // Redirect back to client with code
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set("code", code);
      if (state) {
        redirectUrl.searchParams.set("state", state);
      }

      return c.redirect(redirectUrl.toString());
    } catch (error) {
      // Show login page with error
      return c.html(
        renderLoginPage({
          clientId,
          redirectUri,
          state,
          resource: resource || undefined,
          codeChallenge: codeChallenge || undefined,
          codeChallengeMethod: codeChallengeMethod || undefined,
          error: "Giriş başarısız. E-posta veya şifrenizi kontrol edin.",
        }),
        401
      );
    }
  });

  // Token endpoint
  oauth.post("/oauth/token", async (c) => {
    const store = new SessionStore(c.env);

    // Parse request body (can be form data or JSON)
    let grantType: string;
    let code: string | undefined;
    let redirectUri: string | undefined;
    let clientId: string | undefined;
    let clientSecret: string | undefined;
    let refreshToken: string | undefined;
    let codeVerifier: string | undefined;
    let resource: string | undefined;

    const contentType = c.req.header("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await c.req.formData();
      grantType = formData.get("grant_type") as string;
      code = formData.get("code") as string;
      redirectUri = formData.get("redirect_uri") as string;
      clientId = formData.get("client_id") as string;
      clientSecret = formData.get("client_secret") as string;
      refreshToken = formData.get("refresh_token") as string;
      codeVerifier = formData.get("code_verifier") as string;
      resource = formData.get("resource") as string;
    } else {
      const body = await c.req.json();
      grantType = body.grant_type;
      code = body.code;
      redirectUri = body.redirect_uri;
      clientId = body.client_id;
      clientSecret = body.client_secret;
      refreshToken = body.refresh_token;
      codeVerifier = body.code_verifier;
      resource = body.resource;
    }

    // Check for Basic auth header
    const authHeader = c.req.header("authorization");
    if (authHeader?.startsWith("Basic ")) {
      const decoded = atob(authHeader.slice(6));
      const [basicClientId, basicClientSecret] = decoded.split(":");
      clientId = clientId || basicClientId;
      clientSecret = clientSecret || basicClientSecret;
    }

    // Validate client
    if (!clientId) {
      return c.json({ error: "invalid_client", error_description: "Missing client_id" }, 401);
    }

    const client = await store.getClient(clientId);
    if (!client) {
      return c.json({ error: "invalid_client", error_description: "Unknown client" }, 401);
    }

    if (client.clientSecret !== clientSecret) {
      return c.json({ error: "invalid_client", error_description: "Invalid client_secret" }, 401);
    }

    if (grantType === "authorization_code") {
      if (!code) {
        return c.json({ error: "invalid_request", error_description: "Missing code" }, 400);
      }

      const authCode = await store.getAuthCode(code);
      if (!authCode) {
        return c.json({ error: "invalid_grant", error_description: "Invalid or expired code" }, 400);
      }

      // Verify code hasn't expired
      if (Date.now() > authCode.expiresAt) {
        await store.deleteAuthCode(code);
        return c.json({ error: "invalid_grant", error_description: "Code expired" }, 400);
      }

      // Verify client matches
      if (authCode.clientId !== clientId) {
        return c.json({ error: "invalid_grant", error_description: "Client mismatch" }, 400);
      }

      // Verify redirect URI
      if (redirectUri && authCode.redirectUri !== redirectUri) {
        return c.json({ error: "invalid_grant", error_description: "Redirect URI mismatch" }, 400);
      }

      if (authCode.resource) {
        if (resource && resource !== authCode.resource) {
          return c.json({ error: "invalid_grant", error_description: "Resource mismatch" }, 400);
        }
      } else if (resource) {
        const baseUrl = new URL(c.req.url).origin;
        if (!resource.startsWith(baseUrl)) {
          return c.json({ error: "invalid_target", error_description: "Invalid resource" }, 400);
        }
      }

      // Verify PKCE if used
      if (authCode.codeChallenge) {
        if (!codeVerifier) {
          return c.json({ error: "invalid_request", error_description: "Missing code_verifier" }, 400);
        }

        const valid = await verifyPKCE(
          codeVerifier,
          authCode.codeChallenge,
          authCode.codeChallengeMethod || "plain"
        );

        if (!valid) {
          return c.json({ error: "invalid_grant", error_description: "Invalid code_verifier" }, 400);
        }
      }

      // Delete the auth code (one-time use)
      await store.deleteAuthCode(code);

      // Get the session
      const session = await store.getSession(authCode.sessionId);
      if (!session) {
        return c.json({ error: "invalid_grant", error_description: "Session not found" }, 400);
      }

      // Require client binding - reject legacy sessions without clientId
      if (!session.clientId) {
        return c.json({ error: "invalid_grant", error_description: "Session requires re-authentication" }, 400);
      }

      // Save old tokens for cleanup + rollback
      const oldAccessToken = session.accessToken;
      const oldRefreshToken = session.refreshToken;
      const oldAccessTokenExpiry = session.accessTokenExpiry;
      const oldLastUsedAt = session.lastUsedAt;

      const newAccessToken = generateRandomHex(32);
      const newRefreshToken = generateRandomHex(32);

      let jwt: string;
      try {
        // Update session with new tokens
        session.accessToken = newAccessToken;
        session.refreshToken = newRefreshToken;
        session.accessTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
        session.lastUsedAt = Date.now();

        await store.updateSession(session);
        await store.indexSessionByToken(session.id, newAccessToken);
        await store.indexSessionByRefreshToken(session.id, newRefreshToken);

        // Create JWT for access token
        const baseUrl = new URL(c.req.url).origin;
        const audience = authCode.resource || resource || baseUrl;
        const secret = new TextEncoder().encode(c.env.JWT_SECRET);

        jwt = await new SignJWT({
          sub: session.userId,
          sid: session.id,
          aud: audience,
          iss: baseUrl,
          cid: session.clientId,  // Client binding for reconstruction
          sca: Math.floor(session.createdAt / 1000),  // Session created at (seconds)
          email_enc: session.encryptedEmail,
          email_iv: session.encryptionIv,
          pwd_enc: session.encryptedPassword,
          pwd_iv: session.encryptionIvPassword || session.encryptionIv,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(secret);
      } catch (error) {
        // Rollback: restore old tokens so client can retry
        session.accessToken = oldAccessToken || '';
        session.refreshToken = oldRefreshToken;
        session.accessTokenExpiry = oldAccessTokenExpiry;
        session.lastUsedAt = oldLastUsedAt;
        await store.updateSession(session).catch(() => {});
        await store.deleteTokenIndex(newAccessToken).catch(() => {});
        await store.deleteRefreshTokenIndex(newRefreshToken).catch(() => {});
        return c.json({
          error: "server_error",
          error_description: "Token generation failed, please retry",
        }, 500);
      }

      // SUCCESS: Now safe to delete old tokens
      if (oldAccessToken) {
        await store.deleteTokenIndex(oldAccessToken);
      }
      if (oldRefreshToken) {
        await store.deleteRefreshTokenIndex(oldRefreshToken);
      }

      return c.json({
        access_token: jwt,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: newRefreshToken,
        scope: "openid profile offline_access",
      });
    }

    if (grantType === "refresh_token") {
      if (!refreshToken) {
        return c.json({ error: "invalid_request", error_description: "Missing refresh_token" }, 400);
      }

      // Look up session by refresh token
      const session = await store.getSessionByRefreshToken(refreshToken);
      if (!session) {
        // Clean up orphaned refresh index (session was deleted but index remained)
        await store.deleteRefreshTokenIndex(refreshToken);
        return c.json({ error: "invalid_grant", error_description: "Invalid refresh token" }, 400);
      }

      // Verify refresh token matches (double-check)
      if (session.refreshToken !== refreshToken) {
        // Clean up stale refresh index pointing to wrong session
        await store.deleteRefreshTokenIndex(refreshToken);
        return c.json({ error: "invalid_grant", error_description: "Refresh token mismatch" }, 400);
      }

      // Require client binding - reject legacy sessions without clientId
      if (!session.clientId) {
        return c.json({ error: "invalid_grant", error_description: "Session requires re-authentication" }, 400);
      }
      if (session.clientId !== clientId) {
        return c.json({ error: "invalid_grant", error_description: "Client mismatch" }, 400);
      }

      // Save old tokens for cleanup AFTER success
      const oldRefreshToken = refreshToken;
      const oldAccessToken = session.accessToken;
      const oldAccessTokenExpiry = session.accessTokenExpiry;
      const oldLastUsedAt = session.lastUsedAt;

      // Generate new tokens upfront for rollback tracking
      const newAccessToken = generateRandomHex(32);
      const newRefreshToken = generateRandomHex(32);

      try {
        // Get fresh TGO token using stored credentials
        const tgoToken = await getTGOToken(session, c.env);

        // Update session with new tokens
        session.accessToken = newAccessToken;
        session.refreshToken = newRefreshToken;
        session.accessTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
        session.tgoToken = tgoToken;
        session.lastUsedAt = Date.now();

        await store.updateSession(session);
        await store.indexSessionByToken(session.id, newAccessToken);
        await store.indexSessionByRefreshToken(session.id, newRefreshToken);

        // Create new JWT
        const baseUrl = new URL(c.req.url).origin;
        const secret = new TextEncoder().encode(c.env.JWT_SECRET);
        const jwt = await new SignJWT({
          sub: session.userId,
          sid: session.id,
          aud: resource || baseUrl,
          iss: baseUrl,
          cid: session.clientId,  // Client binding for reconstruction
          sca: Math.floor(session.createdAt / 1000),  // Session created at (seconds)
          email_enc: session.encryptedEmail,
          email_iv: session.encryptionIv,
          pwd_enc: session.encryptedPassword,
          pwd_iv: session.encryptionIvPassword || session.encryptionIv,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(secret);

        // SUCCESS: Now safe to delete old tokens (Fix 1 + Fix 4)
        await store.deleteRefreshTokenIndex(oldRefreshToken);
        if (oldAccessToken) {
          await store.deleteTokenIndex(oldAccessToken);
        }

        return c.json({
          access_token: jwt,
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: newRefreshToken,
          scope: "openid profile offline_access",
        });
      } catch (error) {
        // Best-effort rollback to keep old refresh token valid
        // If failure occurred AFTER updateSession, session has new tokens but client has old token
        // Restore old tokens so client can retry with their existing refresh token
        session.accessToken = oldAccessToken;
        session.refreshToken = oldRefreshToken;
        session.accessTokenExpiry = oldAccessTokenExpiry;
        session.lastUsedAt = oldLastUsedAt;
        await store.updateSession(session).catch(() => {});
        // Clean up any new indexes that may have been created
        await store.deleteTokenIndex(newAccessToken).catch(() => {});
        await store.deleteRefreshTokenIndex(newRefreshToken).catch(() => {});

        return c.json({
          error: "server_error",
          error_description: "Token refresh failed, please retry",
        }, 500);
      }
    }

    return c.json({ error: "unsupported_grant_type" }, 400);
  });

  // Token introspection (for debugging)
  oauth.post("/oauth/introspect", async (c) => {
    const store = new SessionStore(c.env);
    const formData = await c.req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return c.json({ active: false });
    }

    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      const session = await store.getSession(payload.sid as string);
      if (!session) {
        return c.json({ active: false });
      }

      return c.json({
        active: true,
        sub: payload.sub,
        exp: payload.exp,
        iat: payload.iat,
      });
    } catch {
      return c.json({ active: false });
    }
  });

  return oauth;
}

// Middleware to extract and validate session from Authorization header
// Handles KV eventual consistency by falling back to JWT-embedded credentials
export async function getSessionFromRequest(
  authHeader: string | undefined,
  env: Env
): Promise<UserSession | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const store = new SessionStore(env);

    // Try KV first (has fresh TGO token if available)
    let session = await store.getSession(payload.sid as string);

    // Enforce client binding for KV path - require cid and verify match
    if (session && (!payload.cid || session.clientId !== payload.cid)) {
      return null;
    }

    if (!session && payload.email_enc) {
      // Validate iat/exp before using
      const iat = Number(payload.iat);
      if (!Number.isFinite(iat)) {
        return null;  // Reject invalid JWT
      }
      const exp = Number(payload.exp);
      if (!Number.isFinite(exp)) {
        return null;  // Reject invalid JWT
      }

      // Require clientId in JWT for security
      const clientId = payload.cid as string | undefined;
      if (!clientId) {
        return null;  // Reject legacy JWTs without client binding
      }

      // Use sca (session_created_at) if present, fallback to iat for legacy tokens
      const sca = Number(payload.sca);
      const sessionCreatedAt = Number.isFinite(sca) ? sca * 1000 : iat * 1000;

      session = {
        id: payload.sid as string,
        userId: payload.sub as string,
        encryptedEmail: payload.email_enc as string,
        encryptedPassword: payload.pwd_enc as string,
        encryptionIv: payload.email_iv as string,
        encryptionIvPassword: payload.pwd_iv as string,
        accessToken: '',
        accessTokenExpiry: exp * 1000,
        createdAt: sessionCreatedAt,
        lastUsedAt: Date.now(),
        clientId,  // Restore from JWT
        sessionExpiresAt: sessionCreatedAt + 30 * 24 * 60 * 60 * 1000,
      };

      // Store reconstructed session for future requests (fire and forget)
      store.createSession(session).catch(() => {});
    }

    return session;
  } catch {
    return null;
  }
}
