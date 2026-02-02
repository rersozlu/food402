import { test } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";

import { createOAuthRoutes, getSessionFromRequest } from "../src/auth/oauth-provider.js";
import { SessionStore } from "../src/session/store.js";
import type { Env, OAuthAuthorizationCode, OAuthClient, UserSession } from "../src/session/types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

class MemoryKV {
  data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, value: string, _options?: { expirationTtl?: number }): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

const makeEnv = (): Env => ({
  SESSIONS: new MemoryKV() as unknown as KVNamespace,
  THREEDS_PAGES: new MemoryKV() as unknown as KVNamespace,
  OAUTH_CLIENTS: new MemoryKV() as unknown as KVNamespace,
  ENCRYPTION_KEY: "a".repeat(64),
  JWT_SECRET: "test-secret",
  ENVIRONMENT: "test",
});

const registerClient = async (store: SessionStore, overrides: Partial<OAuthClient> = {}) => {
  const client: OAuthClient = {
    clientId: overrides.clientId ?? "client-1",
    clientSecret: overrides.clientSecret ?? "secret-1",
    redirectUris: overrides.redirectUris ?? ["http://localhost/callback"],
    name: overrides.name ?? "Test Client",
    createdAt: overrides.createdAt ?? Date.now(),
  };
  await store.registerClient(client);
  return client;
};

const seedSession = async (store: SessionStore, overrides: Partial<UserSession> = {}) => {
  const now = Date.now();
  const session: UserSession = {
    id: overrides.id ?? "session-1",
    userId: overrides.userId ?? "user-1",
    encryptedEmail: overrides.encryptedEmail ?? "enc-email",
    encryptedPassword: overrides.encryptedPassword ?? "enc-pass",
    encryptionIv: overrides.encryptionIv ?? "iv-email",
    encryptionIvPassword: overrides.encryptionIvPassword ?? "iv-pass",
    tgoToken: overrides.tgoToken,
    tgoTokenExpiry: overrides.tgoTokenExpiry,
    accessToken: overrides.accessToken ?? "access-old",
    refreshToken: overrides.refreshToken,
    accessTokenExpiry: overrides.accessTokenExpiry ?? now + 60_000,
    createdAt: overrides.createdAt ?? now - 10_000,
    lastUsedAt: overrides.lastUsedAt ?? now - 5_000,
    clientId: overrides.clientId,
    sessionExpiresAt: overrides.sessionExpiresAt,
  };

  await store.createSession(session);
  await store.indexSessionByToken(session.id, session.accessToken);
  if (session.refreshToken) {
    await store.indexSessionByRefreshToken(session.id, session.refreshToken);
  }
  return session;
};

const requestToken = async (env: Env, body: URLSearchParams) => {
  const app = createOAuthRoutes();
  return app.request(
    "http://localhost/oauth/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    env
  );
};

test("auth_code grant rejects sessions without clientId", async () => {
  const env = makeEnv();
  const store = new SessionStore(env);
  const client = await registerClient(store);

  const session = await seedSession(store, { clientId: undefined });

  const authCode: OAuthAuthorizationCode = {
    code: "auth-code-1",
    clientId: client.clientId,
    redirectUri: client.redirectUris[0],
    userId: session.userId,
    sessionId: session.id,
    expiresAt: Date.now() + 10_000,
  };
  await store.storeAuthCode(authCode);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: authCode.code,
    redirect_uri: authCode.redirectUri,
    client_id: client.clientId,
    client_secret: client.clientSecret,
  });

  const res = await requestToken(env, body);
  assert.equal(res.status, 400);
  const payload = await res.json();
  assert.equal(payload.error, "invalid_grant");
  assert.match(payload.error_description, /re-authentication/i);
});

test("refresh_token grant rejects sessions without clientId", async () => {
  const env = makeEnv();
  const store = new SessionStore(env);
  const client = await registerClient(store, { clientId: "client-2", clientSecret: "secret-2" });

  const session = await seedSession(store, {
    id: "session-2",
    userId: "user-2",
    refreshToken: "refresh-2",
    clientId: undefined,
    tgoToken: "tgo",
    tgoTokenExpiry: Date.now() + 120_000,
  });

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken ?? "",
    client_id: client.clientId,
    client_secret: client.clientSecret,
  });

  const res = await requestToken(env, body);
  assert.equal(res.status, 400);
  const payload = await res.json();
  assert.equal(payload.error, "invalid_grant");
  assert.match(payload.error_description, /re-authentication/i);
});

test("refresh_token grant cleans up orphaned indexes", async () => {
  const env = makeEnv();
  const store = new SessionStore(env);
  const client = await registerClient(store, { clientId: "client-3", clientSecret: "secret-3" });

  const refreshToken = "orphan-refresh";
  await env.SESSIONS.put(`refresh:${refreshToken}`, "missing-session");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: client.clientId,
    client_secret: client.clientSecret,
  });

  const res = await requestToken(env, body);
  assert.equal(res.status, 400);
  const payload = await res.json();
  assert.equal(payload.error, "invalid_grant");
  const remaining = await env.SESSIONS.get(`refresh:${refreshToken}`);
  assert.equal(remaining, null);
});

test("getSessionFromRequest rejects legacy JWTs without cid", async () => {
  const env = makeEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const jwt = await new SignJWT({
    sub: "user-legacy",
    sid: "session-legacy",
    aud: "http://localhost",
    iss: "http://localhost",
    email_enc: "enc-email",
    email_iv: "iv-email",
    pwd_enc: "enc-pass",
    pwd_iv: "iv-pass",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  const session = await getSessionFromRequest(`Bearer ${jwt}`, env);
  assert.equal(session, null);
});

test("getSessionFromRequest uses sca to prevent session expiry drift", async () => {
  const env = makeEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const now = Date.now();
  const createdAt = now - 20 * DAY_MS;
  const scaSeconds = Math.floor(createdAt / 1000);
  const iatSeconds = Math.floor(now / 1000);

  const jwt = await new SignJWT({
    sub: "user-drift",
    sid: "session-drift",
    aud: "http://localhost",
    iss: "http://localhost",
    cid: "client-drift",
    sca: scaSeconds,
    email_enc: "enc-email",
    email_iv: "iv-email",
    pwd_enc: "enc-pass",
    pwd_iv: "iv-pass",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iatSeconds)
    .setExpirationTime(iatSeconds + 3600)
    .sign(secret);

  const session = await getSessionFromRequest(`Bearer ${jwt}`, env);
  assert.ok(session);
  assert.equal(session?.createdAt, scaSeconds * 1000);
  assert.equal(session?.sessionExpiresAt, scaSeconds * 1000 + 30 * DAY_MS);
  assert.ok(session?.sessionExpiresAt && session.sessionExpiresAt < iatSeconds * 1000 + 30 * DAY_MS);
});

test("getSessionFromRequest rejects cid mismatch when KV session exists", async () => {
  const env = makeEnv();
  const store = new SessionStore(env);
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const session = await seedSession(store, {
    id: "session-cid",
    userId: "user-cid",
    clientId: "client-a",
  });

  const jwt = await new SignJWT({
    sub: session.userId,
    sid: session.id,
    aud: "http://localhost",
    iss: "http://localhost",
    cid: "client-b",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  const result = await getSessionFromRequest(`Bearer ${jwt}`, env);
  assert.equal(result, null);
});

test("getSessionFromRequest falls back to iat when sca is missing", async () => {
  const env = makeEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const issuedAt = nowSeconds - 5 * 24 * 60 * 60;

  const jwt = await new SignJWT({
    sub: "user-legacy-sca",
    sid: "session-legacy-sca",
    aud: "http://localhost",
    iss: "http://localhost",
    cid: "client-legacy",
    email_enc: "enc-email",
    email_iv: "iv-email",
    pwd_enc: "enc-pass",
    pwd_iv: "iv-pass",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(nowSeconds + 3600)
    .sign(secret);

  const session = await getSessionFromRequest(`Bearer ${jwt}`, env);
  assert.ok(session);
  assert.equal(session?.createdAt, issuedAt * 1000);
  assert.equal(session?.sessionExpiresAt, issuedAt * 1000 + 30 * DAY_MS);
});

test("refresh_token grant rolls back when JWT signing fails", async () => {
  const env = makeEnv();
  const store = new SessionStore(env);
  const client = await registerClient(store, { clientId: "client-4", clientSecret: "secret-4" });

  const session = await seedSession(store, {
    id: "session-4",
    userId: "user-4",
    accessToken: "access-4",
    refreshToken: "refresh-4",
    clientId: client.clientId,
    tgoToken: "tgo-token",
    tgoTokenExpiry: Date.now() + 120_000,
  });

  const originalSign = SignJWT.prototype.sign;
  SignJWT.prototype.sign = async () => {
    throw new Error("sign failure");
  };

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.refreshToken ?? "",
      client_id: client.clientId,
      client_secret: client.clientSecret,
    });

    const res = await requestToken(env, body);
    assert.equal(res.status, 500);

    const restored = await store.getSessionWithoutUpdate(session.id);
    assert.equal(restored?.accessToken, session.accessToken);
    assert.equal(restored?.refreshToken, session.refreshToken);

    const tokenKeys = Array.from((env.SESSIONS as unknown as MemoryKV).data.keys()).filter((key) =>
      key.startsWith("token:")
    );
    assert.deepEqual(tokenKeys, [`token:${session.accessToken}`]);

    const refreshKeys = Array.from((env.SESSIONS as unknown as MemoryKV).data.keys()).filter((key) =>
      key.startsWith("refresh:")
    );
    assert.deepEqual(refreshKeys, [`refresh:${session.refreshToken}`]);
  } finally {
    SignJWT.prototype.sign = originalSign;
  }
});
