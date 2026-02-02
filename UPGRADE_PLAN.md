# MCP SDK API Migration Plan

## Executive Summary

**Current State:**
- `/Users/rafi/Desktop/food402/src/index.ts` - 21 `server.tool()` calls + 1 `server.prompt()` call
- SDK Version: `@modelcontextprotocol/sdk@1.25.3`

**Target State:**
- All tools use `server.registerTool()` pattern
- All prompts use `server.registerPrompt()` pattern
- Add `title` for improved tool discoverability

---

## 1. Backup/Git Branch Strategy

```bash
# Create a feature branch for the migration
git checkout -b feat/migrate-to-registertool-api

# Verify clean working directory
git status

# Optional: Create a backup tag of current state
git tag pre-migration-backup
```

**Rollback Strategy:** If issues arise, simply `git checkout master` to return to the working state.

---

## 2. Package Version Updates

**No package updates required.** The current SDK version (`1.25.3`) already supports both the deprecated `server.tool()` and the new `server.registerTool()` APIs. The deprecation warnings will be eliminated by migrating to the new API.

---

## 2.1 Annotations Note

If any existing tools use annotations (`readOnlyHint`, `openWorldHint`, etc.), these must be moved into the `annotations` property within the config object:

```typescript
server.registerTool(
  "tool_name",
  {
    title: "Tool Name",
    description: "...",
    inputSchema: {...},
    annotations: {
      readOnlyHint: true,
      openWorldHint: false
    }
  },
  handler
);
```

**Current codebase status:** No existing tools use annotations, so this is for reference only.

---

## 3. API Pattern Transformation

### 3.1 Tool Migration Pattern

**OLD Pattern (deprecated):**
```typescript
server.tool(
  "tool_name",
  "Tool description",
  {
    param1: z.string().describe("Description"),
    param2: z.number().optional().describe("Optional param"),
  },
  async (args) => {
    // handler
    return formatResponse(result);
  }
);
```

**NEW Pattern (current):**
```typescript
server.registerTool(
  "tool_name",
  {
    title: "Tool Name",  // NEW: Human-readable display name
    description: "Tool description",
    inputSchema: {
      param1: z.string().describe("Description"),
      param2: z.number().optional().describe("Optional param"),
    },
    // annotations: { readOnlyHint: true },  // OPTIONAL: Add if tool has annotations
  },
  async (args) => {
    // handler - args object same as before, destructuring is optional
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);
```

**Note:** The handler signature remains the same (args object). Destructuring like `async ({ param1 }) =>` is optional and a style preference.

### 3.2 Prompt Migration Pattern

**OLD Pattern (deprecated):**
```typescript
server.prompt(
  "prompt_name",
  "Prompt description",
  async () => {
    return { messages: [...] };
  }
);
```

**NEW Pattern (current):**
```typescript
server.registerPrompt(
  "prompt_name",
  {
    title: "Prompt Name",
    description: "Prompt description",
  },
  async () => {
    return { messages: [...] };
  }
);
```

---

## 4. Tools to Migrate

### File: `src/index.ts` (22 items)

| Tool Name | Has Params | Description |
|-----------|------------|-------------|
| `get_addresses` | No | Get saved delivery addresses |
| `select_address` | Yes | Select a delivery address |
| `get_restaurants` | Yes | Get nearby restaurants |
| `get_restaurant_menu` | Yes | Get restaurant menu |
| `get_product_details` | Yes | Get product details |
| `get_product_recommendations` | Yes | Get product recommendations |
| `add_to_basket` | Yes | Add items to cart |
| `get_basket` | No | Get current basket |
| `remove_from_basket` | Yes | Remove item from basket |
| `clear_basket` | No | Clear the basket |
| `search_restaurants` | Yes | Search restaurants |
| `get_cities` | No | Get cities list |
| `get_districts` | Yes | Get districts for city |
| `get_neighborhoods` | Yes | Get neighborhoods |
| `add_address` | Yes | Add new address |
| `get_saved_cards` | No | Get saved payment cards |
| `checkout_ready` | No | Check if ready to checkout |
| `set_order_note` | Yes | Set order notes |
| `place_order` | Yes | Place the order |
| `get_orders` | Yes | Get order history |
| `get_order_detail` | Yes | Get order details |
| `order_food` (prompt) | N/A | Start ordering session |

---

## 5. Implementation Order

### Phase 1: Local Server (`src/index.ts`)
1. Migrate simple no-param tools first (`get_addresses`, `get_basket`, etc.)
2. Progress to parameterized tools
3. Migrate the `order_food` prompt last
4. Build and test locally with `npm run build && npm start`

### Phase 2: Integration Testing
1. Full end-to-end test with Claude Desktop/Code

---

## 6. Testing Strategy

### Pre-Migration Testing
```bash
# Verify current functionality works
cd /Users/rafi/Desktop/food402
npm run build
npm start
```

### Post-Migration Testing

**Local Server:**
1. Run `npm run build` - verify no TypeScript errors
2. Run `npm start` and connect via Claude Desktop/Code
3. Test each tool category:
   - Address tools: `get_addresses`, `select_address`, `add_address`
   - Restaurant tools: `get_restaurants`, `search_restaurants`, `get_restaurant_menu`
   - Product tools: `get_product_details`, `get_product_recommendations`
   - Cart tools: `add_to_basket`, `get_basket`, `remove_from_basket`, `clear_basket`
   - Checkout tools: `get_saved_cards`, `checkout_ready`, `set_order_note`, `place_order`
   - Order tools: `get_orders`, `get_order_detail`
   - Prompt: Invoke `order_food` prompt

### Regression Test Checklist

| Test Case | Expected Result |
|-----------|-----------------|
| `get_addresses` returns addresses | JSON array of addresses |
| `select_address` with valid ID | Success message with address details |
| `get_restaurants` with coordinates | List of restaurants |
| `add_to_basket` with valid item | Item added, basket updated |
| `clear_basket` | Empty basket |
| `order_food` prompt | Displays addresses and workflow instructions |
| Error handling | Errors return `isError: true` |

---

## 7. Rollback Plan

**Immediate Rollback (during development):**
```bash
git checkout master
```

**Post-Merge Rollback (if issues in production):**
```bash
git revert <commit-hash>
```

---

## 8. Migration Examples

### Example 1: Tool with no parameters

**Before:**
```typescript
server.tool(
  "get_addresses",
  "Get user's saved delivery addresses.",
  {},
  async () => {
    const result = await getAddresses();
    return formatResponse(result);
  }
);
```

**After:**
```typescript
server.registerTool(
  "get_addresses",
  {
    title: "Get Addresses",
    description: "Get user's saved delivery addresses.",
    inputSchema: {},  // Keep empty object for consistent validation behavior
  },
  async () => {
    const result = await getAddresses();
    return formatResponse(result);
  }
);
```

**Note:** Including `inputSchema: {}` maintains the same validation behavior as the old pattern. Omitting it would change how inputs are validated.

### Example 2: Tool with parameters

**Before:**
```typescript
server.tool(
  "select_address",
  "Select a delivery address.",
  {
    addressId: z.number().describe("Address ID from get_addresses"),
  },
  async (args) => {
    await setShippingAddress({
      shippingAddressId: args.addressId,
      invoiceAddressId: args.addressId,
    });
  }
);
```

**After:**
```typescript
server.registerTool(
  "select_address",
  {
    title: "Select Address",
    description: "Select a delivery address.",
    inputSchema: {
      addressId: z.number().describe("Address ID from get_addresses"),
    },
  },
  async ({ addressId }) => {
    await setShippingAddress({
      shippingAddressId: addressId,
      invoiceAddressId: addressId,
    });
  }
);
```

### Example 3: Prompt migration

**Before:**
```typescript
server.prompt(
  "order_food",
  "Start a food ordering session.",
  async () => {
    return { messages: [...] };
  }
);
```

**After:**
```typescript
server.registerPrompt(
  "order_food",
  {
    title: "Order Food",
    description: "Start a food ordering session.",
  },
  async () => {
    return { messages: [...] };
  }
);
```
