# Food402 MCP Server

[![npm version](https://img.shields.io/npm/v/food402.svg)](https://www.npmjs.com/package/food402)

An MCP (Model Context Protocol) server that enables AI assistants to order food from TGO Yemek. Simply chat with your AI assistant to browse restaurants, build your order, and complete checkout.

## Installation

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

## Development

```bash
# Clone the repository
git clone https://github.com/rersozlu/food402.git
cd food402

# Install dependencies
npm install

# Run in development mode
npm start

# Build TypeScript
npm run build
```

## License

MIT
