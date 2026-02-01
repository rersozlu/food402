// remote/src/worker.ts - Cloudflare Worker entry point

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./session/types.js";
import { createOAuthRoutes, getSessionFromRequest } from "./auth/oauth-provider.js";
import { create3DSRoutes } from "./payment/3ds-handler.js";
import { createMcpServer } from "./server.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

// Create main Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS configuration for Claude.ai
app.use(
  "*",
  cors({
    origin: ["https://claude.ai", "https://www.claude.ai", "https://console.anthropic.com"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Mcp-Session-Id",
      "mcp-protocol-version",
      "Last-Event-ID",
    ],
    exposeHeaders: ["Mcp-Session-Id", "mcp-protocol-version"],
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount OAuth routes
app.route("/", createOAuthRoutes());

// Mount 3D Secure routes
app.route("/", create3DSRoutes());

// MCP endpoint - Streamable HTTP transport (supports GET for SSE, POST for messages, DELETE for cleanup)
// Handle at both "/" and "/mcp" since Claude posts to the connector URL root
const mcpHandler = async (c: any) => {
  const authHeader = c.req.header("authorization");
  const session = await getSessionFromRequest(authHeader, c.env);

  if (!session) {
    const baseUrl = new URL(c.req.url).origin;
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Unauthorized. Please authenticate via OAuth first.",
        },
        id: null,
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/mcp", scope="openid profile offline_access"`,
        },
      }
    );
  }

  // Get base URL for 3DS page hosting
  const baseUrl = new URL(c.req.url).origin;

  // Create stateless transport (no session ID - we use OAuth sessions for auth)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode - each request is independent
    enableJsonResponse: true, // Allow JSON responses for simple requests
  });

  // Create MCP server for this request with session context
  const mcpServer = createMcpServer({
    session,
    env: c.env,
    baseUrl,
  });

  try {
    // Connect the server to the transport
    await mcpServer.connect(transport);

    // Let transport handle the request (GET, POST, or DELETE)
    const response = await transport.handleRequest(c.req.raw);

    // Clean up after response is sent
    // Note: For streaming responses, cleanup happens when stream ends
    return response;
  } catch (err) {
    console.error("MCP error:", err);
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : "Internal error",
        },
        id: null,
      },
      500
    );
  }
};

// Register MCP handler for both /mcp and root
app.all("/mcp", mcpHandler);

// Root path: handle MCP for POST/DELETE, redirect GET to manifest
app.all("/", async (c) => {
  // POST and DELETE are MCP protocol requests
  if (c.req.method === "POST" || c.req.method === "DELETE") {
    return mcpHandler(c);
  }
  // GET redirects to manifest for browser discovery
  return c.redirect("/.well-known/mcp-manifest");
});

// Export for Cloudflare Workers
export default app;
