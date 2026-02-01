// remote/src/payment/3ds-handler.ts - 3D Secure page hosting

import { Hono } from "hono";
import type { Env, ThreeDSecurePage } from "../session/types.js";
import { SessionStore } from "../session/store.js";
import { generateUUID } from "../auth/crypto.js";

// 3DS page TTL: 15 minutes
const THREEDS_TTL_MS = 15 * 60 * 1000;

export function create3DSRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // Serve 3D Secure verification page
  app.get("/3ds/:pageId", async (c) => {
    const pageId = c.req.param("pageId");
    const store = new SessionStore(c.env);

    const page = await store.get3DSPage(pageId);

    if (!page) {
      return c.html(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Page Not Found</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f9fafb;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 { color: #dc2626; margin-bottom: 16px; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Page Not Found</h1>
            <p>This 3D Secure verification page has expired or does not exist.</p>
          </div>
        </body>
        </html>`,
        404
      );
    }

    // Check if expired
    if (Date.now() > page.expiresAt) {
      await store.delete3DSPage(pageId);
      return c.html(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Page Expired</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f9fafb;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 { color: #f59e0b; margin-bottom: 16px; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Page Expired</h1>
            <p>This 3D Secure verification page has expired. Please try placing your order again.</p>
          </div>
        </body>
        </html>`,
        410
      );
    }

    // Check if already used
    if (page.used) {
      return c.html(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Already Used</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f9fafb;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 { color: #f59e0b; margin-bottom: 16px; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Verification Complete</h1>
            <p>This 3D Secure verification has already been completed.</p>
          </div>
        </body>
        </html>`,
        410
      );
    }

    // Mark as used
    await store.mark3DSPageUsed(pageId);

    // Return the 3D Secure HTML content
    return c.html(page.htmlContent);
  });

  return app;
}

/**
 * Store a 3D Secure HTML page and return the URL to access it
 */
export async function store3DSPage(
  sessionId: string,
  htmlContent: string,
  env: Env,
  baseUrl: string
): Promise<string> {
  const store = new SessionStore(env);
  const pageId = generateUUID();

  const page: ThreeDSecurePage = {
    id: pageId,
    sessionId,
    htmlContent,
    createdAt: Date.now(),
    expiresAt: Date.now() + THREEDS_TTL_MS,
    used: false,
  };

  await store.store3DSPage(page);

  return `${baseUrl}/3ds/${pageId}`;
}
