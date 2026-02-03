# Food402 MCP Server

[![npm version](https://img.shields.io/npm/v/food402.svg)](https://www.npmjs.com/package/food402)
[![ClawHub](https://img.shields.io/badge/ClawHub-food402-blue)](https://www.clawhub.ai/rersozlu/food402)

An MCP (Model Context Protocol) server that enables AI assistants to order food from TGO Yemek. Simply chat with your AI assistant to browse restaurants, build your order, and complete checkout. Works with Claude, ChatGPT (Developer Mode), and Codex CLI via MCP.

---

## Clawdbot / OpenClaw (AgentSkills)

Food402 is also available as an [AgentSkill on ClawHub](https://www.clawhub.ai/rersozlu/food402) for use with Clawdbot (OpenClaw), Claude Code, Cursor, Codex, Gemini CLI, and other AgentSkills-compatible tools.

**Install via ClawHub:**
```bash
clawhub install rersozlu/food402
```

**Or manually:** Copy the `skill/` folder to `~/.openclaw/skills/food402/` and configure your credentials in `~/.openclaw/openclaw.json`.

---

## Local MCP Server (npm package)

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "food402": {
      "command": "npx",
      "args": ["-y", "food402"],
      "env": {
        "TGO_EMAIL": "your-email@example.com",
        "TGO_PASSWORD": "your-password"
      }
    }
  }
}
```

Replace `your-email@example.com` and `your-password` with your TGO Yemek credentials.

### Claude Code

For project-specific installation with Claude Code:

```bash
npm install food402
```

This automatically adds `food402` to your `.mcp.json`. Open the file and update your credentials:

```json
{
  "mcpServers": {
    "food402": {
      "command": "node",
      "args": ["./node_modules/food402/dist/src/index.js"],
      "env": {
        "TGO_EMAIL": "your-email@example.com",
        "TGO_PASSWORD": "your-password"
      }
    }
  }
}
```

### Codex CLI (Terminal)

Codex reads MCP servers from your global config at `~/.codex/config.toml`.

**Option A: Via CLI**

```bash
codex mcp add food402 --env TGO_EMAIL=your-email@example.com --env TGO_PASSWORD=your-password -- npx -y food402
```

**Option B: Manual config**

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.food402]
command = "npx"
args = ["-y", "food402"]

[mcp_servers.food402.env]
TGO_EMAIL = "your-email@example.com"
TGO_PASSWORD = "your-password"
```

---

## Prerequisites

### Account Setup Required

Before using this MCP server, you must have a TGO Yemek account with:

1. **TGO Yemek account** - Create one at tgoyemek.com if you don't have one
2. **Payment card saved to your account** - The checkout process requires a saved card; you cannot enter card details during ordering
3. **At least one delivery address saved** (recommended) - You can add addresses through the MCP, but having one pre-configured makes ordering faster

## Quick Start: Ordering Flow

Here's the typical workflow when ordering food through the AI assistant:

### 1. Select Delivery Address
```
"Show me my saved addresses"
"Select my home address for delivery"
```

### 2. Find Restaurants
```
"What restaurants are near me?"
"Search for pizza restaurants"
"Find places that serve lahmacun"
```

### 3. Browse Menu & Add Items
```
"Show me the menu for [restaurant name]"
"Add 2 lahmacun to my cart"
"What customization options are available for this item?"
```

### 4. Review & Checkout
```
"Show me my basket"
"Remove the drink from my order"
"I'm ready to checkout"
```

### 5. Place Order
```
"Place my order using my saved card"
```
*Note: A browser window will open for 3D Secure verification. Complete the verification to finalize your order.*

### 6. Track Order
```
"What's the status of my order?"
"Show me my recent orders"
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_addresses` | Get user's saved delivery addresses | None |
| `select_address` | Select delivery address (must call before ordering) | `addressId` |
| `get_restaurants` | Search restaurants near a location | `latitude`, `longitude`, `page?` |
| `search_restaurants` | Search restaurants and products by keyword | `searchQuery`, `latitude`, `longitude`, `page?` |
| `get_restaurant_menu` | Get restaurant's full menu | `restaurantId`, `latitude`, `longitude` |
| `get_product_details` | Get product customization options | `restaurantId`, `productId`, `latitude`, `longitude` |
| `get_product_recommendations` | Get "goes well with" suggestions | `restaurantId`, `productIds[]` |
| `add_to_basket` | Add items to cart | `storeId`, `items[]`, `latitude`, `longitude`, etc. |
| `get_basket` | Get current cart contents | None |
| `remove_from_basket` | Remove item from cart | `itemId` |
| `clear_basket` | Clear entire cart | None |
| `get_cities` | Get list of all cities for address selection | None |
| `get_districts` | Get districts for a city | `cityId` |
| `get_neighborhoods` | Get neighborhoods for a district | `districtId` |
| `add_address` | Add a new delivery address | `name`, `surname`, `phone`, `addressName`, `addressLine`, `cityId`, `districtId`, `neighborhoodId`, `latitude`, `longitude`, etc. |
| `get_saved_cards` | Get user's saved payment cards (masked) | None |
| `checkout_ready` | Get basket ready for checkout with payment context | None |
| `set_order_note` | Set order note and delivery preferences | `note?`, `noServiceWare?`, `contactlessDelivery?`, `dontRingBell?` |
| `place_order` | Place order with 3D Secure (opens browser for verification) | `cardId` |
| `get_orders` | Get user's order history with status | `page?` |
| `get_order_detail` | Get detailed order info including delivery status | `orderId` |

## Optional Features

### Google Reviews Integration

The `get_google_reviews` tool allows you to fetch Google Reviews for restaurants, enabling comparison between TGO ratings and Google ratings. This feature is **optional** and requires a Google Places API key.

**To enable Google Reviews:**

1. Get a Google Places API key from the [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable BOTH APIs** for your project (both are required):
   - **Places API (New)** - Used for text search to find restaurants
   - **Places API** - Used for fetching place details and reviews
3. Add the key to your MCP server configuration:

```json
{
  "mcpServers": {
    "food402": {
      "command": "npx",
      "args": ["-y", "food402"],
      "env": {
        "TGO_EMAIL": "your-email@example.com",
        "TGO_PASSWORD": "your-password",
        "GOOGLE_PLACES_API_KEY": "your-google-api-key"
      }
    }
  }
}
```

**Without the API key:** The tool will return a helpful message indicating the feature is unavailable but won't cause any errors. The rest of the food ordering functionality works normally without it.

---

## Development

### Repository Structure

```
food402/
├── src/                    # MCP server (stdio transport)
│   ├── index.ts            # MCP entry point with tool definitions
│   ├── auth.ts             # TGO auth with token caching
│   ├── api.ts              # Thin wrapper around shared/api.ts
│   └── postinstall.ts      # Auto-configures .mcp.json on npm install
├── shared/                 # Shared API code
│   ├── api.ts              # Token-parameterized TGO API functions
│   └── types.ts            # TypeScript interfaces
├── test/                   # Test suite
│   ├── integration/        # API integration tests
│   ├── security/           # Security validation tests
│   └── setup/              # Test utilities and fixtures
├── package.json            # Root package (npm: food402)
├── README.md
└── CLAUDE.md
```

### Local Server Development

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build TypeScript
npm run build
```

### Testing

The project includes integration tests and security tests using Vitest.

```bash
# Run all tests
npm test

# Run security tests only
npm run test:security

# Run tests with coverage
npm run test:coverage
```

**Setup for tests:**

1. Copy `test/.env.test.example` to `test/.env.test`
2. Add your TGO credentials to `test/.env.test`
3. Run `npm test`

Tests cover:
- Address management (cities, districts, neighborhoods)
- Restaurant discovery and menu browsing
- Basket/cart operations
- Payment card retrieval and checkout readiness
- Order history
- Security checks for credential handling

## License

MIT
