# TGO Yemek MCP Server

An MCP (Model Context Protocol) server that exposes TGO Yemek API functions as tools for AI assistants to order food.

## Prerequisites

- Node.js 18+
- A TGO Yemek account (email and password)

## Installation

```bash
npm install
```

## MCP Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "tgo-yemek": {
      "command": "npx",
      "args": ["tsx", "/path/to/yemeksepeti/src/index.ts"],
      "env": {
        "TGO_EMAIL": "your-email@example.com",
        "TGO_PASSWORD": "your-password"
      }
    }
  }
}
```             


Or using npm start:

```json
{
  "mcpServers": {
    "tgo-yemek": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/path/to/yemeksepeti",
      "env": {
        "TGO_EMAIL": "your-email@example.com",
        "TGO_PASSWORD": "your-password"
      }
    }
  }
}
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_addresses` | Get user's saved delivery addresses | None |
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

## Usage Examples

### Get delivery addresses
```
"Show me my saved addresses"
```

### Find restaurants
```
"Find restaurants near my home address"
```

### Browse menu
```
"Show me the menu for restaurant ID 12345"
```

### Order food
```
"Add 2 lahmacun to my cart from this restaurant"
```

## Development

```bash
# Run in development mode
npm start

# Build TypeScript
npm run build
```

## Testing

Test the MCP server locally:

```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/index.ts

# Test a tool (requires credentials)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_addresses","arguments":{}}}' | \
  TGO_EMAIL="email" TGO_PASSWORD="pass" npx tsx src/index.ts
```
