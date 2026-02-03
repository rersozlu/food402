# Contributing to Food402

Thank you for your interest in contributing to Food402! This guide will help you get started, whether you're fixing a bug or building a new module.

For project overview and usage, see the [README](README.md).

## Contribution Types

- **Bug Fixes** - Fixing issues in existing code
- **Module Builders** - Adding new features or integrations

---

## Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/your-username/food402.git
cd food402
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Test Credentials

```bash
cp test/.env.test.example test/.env.test
# Edit test/.env.test with your TGO Yemek credentials
```

### 4. Verify Setup

```bash
npm test
```

All tests should pass before you start making changes.

---

## Bug Fixes Path

For contributors fixing bugs in existing code.

### Step 1: Find the Issue Location

| Area | File Location |
|------|---------------|
| Core API logic | `shared/api.ts` |
| MCP tool definitions | `src/index.ts` |
| Authentication | `src/auth.ts` |
| Module-specific | `shared/modules/<module-name>/` |

### Step 2: Write a Failing Test First

Create a test that reproduces the bug:

- **Location:** `test/integration/` for API tests
- **Pattern:** Use `beforeAll` for authentication (token is cached)
- **Timeout:** 30 seconds for API calls

Run your test:

```bash
npx vitest run test/integration/<file>.test.ts
```

### Step 3: Fix the Bug

- Follow TypeScript strict mode (no `any` types)
- Maintain existing code style
- Keep changes focused on the fix

### Step 4: Verify

```bash
npm test                  # All tests pass
npm run test:security     # No credential leaks
npm run build             # TypeScript compiles
```

### Step 5: Commit

Use conventional commit format:

```bash
git commit -m "fix: handle empty restaurant list in search results"
```

---

## Module Builders Path

For contributors adding new features or integrations.

### Reference Example

The `google-reviews` module demonstrates the complete pattern:

```
shared/modules/google-reviews/
├── index.ts      # Public exports (getGoogleReviews)
├── types.ts      # TypeScript interfaces
├── api.ts        # Google Places API wrapper
├── cache.ts      # LRU cache with TTL
├── matching.ts   # Restaurant name matching
└── utils.ts      # fetchWithRetry, calculateDistance
```

### Step 1: Create Module Folder

```bash
mkdir -p shared/modules/<module-name>
```

Create these files:

| File | Purpose |
|------|---------|
| `index.ts` | Public exports |
| `types.ts` | TypeScript interfaces |
| `api.ts` | External API calls (if needed) |
| `utils.ts` | Helper functions |
| `cache.ts` | Caching logic (if needed) |

### Step 2: Define Types

Add types in `shared/modules/<module-name>/types.ts`:

```typescript
export interface MyFeatureResult {
  id: string;
  name: string;
  // ...
}
```

If types are used externally, re-export from `shared/types.ts`:

```typescript
export * from "./modules/<module-name>/types";
```

### Step 3: Implement the Module

In `shared/modules/<module-name>/index.ts`:

```typescript
import { MyFeatureResult } from "./types";

export async function getMyFeature(
  token: string,
  params: { /* ... */ }
): Promise<MyFeatureResult | { error: string }> {
  // Implementation
  // Handle errors gracefully
  // Optional features should work without required env vars
}
```

### Step 4: Integrate with MCP

**Add wrapper in `src/api.ts`:**

```typescript
import { getMyFeature as getMyFeatureImpl } from "../shared/modules/<module-name>";

export async function getMyFeature(params: { /* ... */ }) {
  const token = await getToken();
  return getMyFeatureImpl(token, params);
}
```

**Register tool in `src/index.ts`:**

```typescript
server.tool(
  "my_feature",
  "Description of what this feature does",
  {
    param1: z.string().describe("Parameter description"),
    param2: z.number().optional().describe("Optional parameter"),
  },
  async ({ param1, param2 }) => {
    const result = await api.getMyFeature({ param1, param2 });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);
```

### Step 5: Add Tests

Create test folder:

```bash
mkdir -p test/modules/<module-name>
```

**Unit tests** for algorithms/utilities:

```typescript
// test/modules/<module-name>/utils.test.ts
import { describe, it, expect } from "vitest";
import { myHelper } from "../../../shared/modules/<module-name>/utils";

describe("myHelper", () => {
  it("should do something", () => {
    expect(myHelper("input")).toBe("expected");
  });
});
```

**Integration tests** for API calls:

```typescript
// test/modules/<module-name>/<module-name>.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { getMyFeature } from "../../../src/api";

describe("<module-name> integration", () => {
  beforeAll(async () => {
    // Auth happens automatically via cached token
  });

  it("should fetch data", async () => {
    const result = await getMyFeature({ param1: "test" });
    expect(result).toHaveProperty("id");
  }, 30000); // 30s timeout for API calls
});
```

Run tests:

```bash
npx vitest run test/modules/<module-name>/
```

### Step 6: Update Environment Variables (if required)

**Add to `.env.example`:**

```bash
# Optional: Feature X API key
FEATURE_X_API_KEY=your-api-key
```

**Add to `test/.env.test.example`** (if needed for tests):

```bash
FEATURE_X_API_KEY=your-api-key
```

### Step 7: Update Skill Folder (for AgentSkills/OpenClaw)

**Update `skill/SKILL.md` YAML frontmatter** (if new env var):

```yaml
metadata: {"openclaw": {"requires": {"env": ["TGO_EMAIL", "TGO_PASSWORD", "FEATURE_X_API_KEY"]}}}
```

**Add operation section:**

```markdown
### my_feature

Description of what this operation does.

**Parameters:**
- `param1` (required): Description of parameter
- `param2` (optional): Description of optional parameter

```bash
TOKEN=$({baseDir}/scripts/auth.sh get-token)
curl -s "https://api.example.com/endpoint" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Response fields:** `field1`, `field2`, `field3`
```

### Step 8: Update Documentation

**Add to README.md:**

1. Add tool to "Available Tools" table
2. If optional, add to "Optional Features" section

### Step 9: Commit

Use conventional commit format:

```bash
git commit -m "feat: add <module-name> integration"
```

---

## Code Standards

| Standard | Requirement |
|----------|-------------|
| TypeScript | Strict mode enabled, no `any` types |
| Input validation | Use Zod schemas for all MCP tools |
| Error handling | Return formatted error objects, never throw unhandled |
| Type exports | Manage carefully via `shared/types.ts` |
| Response transformation | Simplify API responses for AI context efficiency |

---

## Testing Requirements

| Contribution Type | Required Tests |
|-------------------|----------------|
| Bug fix | Test case reproducing the bug |
| New API function | Integration test in `test/integration/` |
| New module | Unit + integration tests in `test/modules/<name>/` |
| Any change | Security tests must pass |

### Test Commands

```bash
npm test                    # Run all tests
npm run test:security       # Run security tests only
npm run test:coverage       # Run with coverage report
npx vitest run <path>       # Run specific test file
```

### Test Patterns

- Use `beforeAll` to authenticate once (token is cached)
- Set 30-second timeout for API calls
- Validate response structure, not exact values
- Mock external services for unit tests when appropriate

---

## Pull Request Checklist

Before submitting your PR, verify:

- [ ] Tests added/updated for changes
- [ ] All tests passing (`npm test`)
- [ ] Security tests passing (`npm run test:security`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] README updated (if adding feature)
- [ ] `.env.example` updated (if adding env var)
- [ ] `skill/SKILL.md` updated (if adding new operation)

---

## Security Guidelines

- Never hardcode credentials
- Use `process.env` for all secrets
- Verify `.gitignore` excludes sensitive files (`.env`, `.env.test`)
- Never log tokens or passwords
- Optional features must work gracefully without API keys (return friendly message)
- Run `npm run test:security` to verify no credential leaks

---

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type: short description

Examples:
- fix: handle empty restaurant list in search results
- feat: add Google Reviews integration with branch matching
- chore: update dependencies
- docs: add contribution guidelines
- test: add basket edge case tests
```

---

## Questions?

If you have questions or need help:

1. Check existing issues for similar questions
2. Open a new issue with your question
3. Tag it with `question` label
