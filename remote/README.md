# Food402 Remote MCP Server

Remote MCP server for Claude.ai web access, deployed on Cloudflare Workers.

## Architecture

- **OAuth Provider**: Wraps TGO Yemek login with OAuth 2.0 for Claude.ai
- **MCP Server**: JSON-RPC over HTTP with per-user session isolation
- **Session Store**: Encrypted credentials stored in Cloudflare KV
- **3D Secure Handler**: Hosts payment verification pages

## Deployment

### 1. Create KV Namespaces

```bash
npx wrangler kv:namespace create SESSIONS
npx wrangler kv:namespace create THREEDS_PAGES
npx wrangler kv:namespace create OAUTH_CLIENTS
```

Update the IDs in `wrangler.toml` with the returned namespace IDs.

### 2. Set Secrets

```bash
# Generate a 32-byte hex encryption key for AES-256
openssl rand -hex 32 | npx wrangler secret put ENCRYPTION_KEY

# Generate a JWT secret
openssl rand -base64 32 | npx wrangler secret put JWT_SECRET
```

### 3. Deploy

```bash
npm run deploy
```

### 4. Register in Claude.ai

1. Go to Claude.ai Settings > Connectors
2. Click "Add Custom Connector"
3. Enter your worker URL (e.g., `https://food402-remote.your-subdomain.workers.dev`)
4. Complete the OAuth flow by logging in with your TGO Yemek credentials

## Local Development

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/.well-known/oauth-authorization-server` | OAuth metadata |
| `/.well-known/mcp-manifest` | MCP server manifest |
| `/oauth/register` | Dynamic client registration |
| `/oauth/authorize` | OAuth authorization (shows login) |
| `/oauth/token` | Token exchange |
| `/mcp` | MCP JSON-RPC endpoint |
| `/3ds/:pageId` | 3D Secure verification pages |
| `/health` | Health check |

## Security

- Credentials encrypted at rest using AES-256-GCM
- HTTPS enforced on all endpoints
- CORS restricted to Claude.ai domains
- Sessions expire after 30 days of inactivity
- 3D Secure pages expire after 15 minutes
