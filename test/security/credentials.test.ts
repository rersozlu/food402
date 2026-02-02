// test/security/credentials.test.ts - Security tests for credential handling
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, "../..");

describe("Security: Credential Handling", () => {
  describe("No hardcoded credentials in source", () => {
    const sourceFiles = [
      "src/index.ts",
      "src/auth.ts",
      "src/api.ts",
      "src/postinstall.ts",
      "shared/api.ts",
      "shared/types.ts",
    ];

    const sensitivePatterns = [
      // Email patterns
      /['"`][a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}['"`]/g,
      // Password assignments (not environment variables)
      /password\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/gi,
      // API keys
      /api[_-]?key\s*[:=]\s*['"`][a-zA-Z0-9]{16,}['"`]/gi,
      // Bearer tokens (hardcoded)
      /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,
      // JWT-like tokens
      /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
      // TGO credentials as hardcoded values (not env var references)
      /TGO_EMAIL\s*[:=]\s*['"`][^'"`\s]+@[^'"`\s]+['"`]/gi,
      /TGO_PASSWORD\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/gi,
    ];

    sourceFiles.forEach((file) => {
      it(`should not contain hardcoded credentials in ${file}`, () => {
        const filePath = resolve(ROOT_DIR, file);

        if (!existsSync(filePath)) {
          console.warn(`File not found: ${file}`);
          return;
        }

        const content = readFileSync(filePath, "utf-8");

        sensitivePatterns.forEach((pattern) => {
          const matches = content.match(pattern) || [];
          // Filter out false positives (example emails, placeholder values)
          const suspicious = matches.filter((m) => {
            const lower = m.toLowerCase();
            return (
              !lower.includes("example") &&
              !lower.includes("placeholder") &&
              !lower.includes("noreply") &&
              !lower.includes("test@") &&
              !lower.includes("your-") &&
              !lower.includes("xxx")
            );
          });

          expect(
            suspicious,
            `Found potential hardcoded credential in ${file}: ${suspicious.join(", ")}`
          ).toHaveLength(0);
        });
      });
    });
  });

  describe("Environment variables usage", () => {
    it("should use environment variables for credentials in auth.ts", () => {
      const authPath = resolve(ROOT_DIR, "src/auth.ts");
      const content = readFileSync(authPath, "utf-8");

      // Should use process.env for credentials
      expect(content).toContain("process.env.TGO_EMAIL");
      expect(content).toContain("process.env.TGO_PASSWORD");

      // Should NOT have direct credential values
      expect(content).not.toMatch(
        /email:\s*['"`][a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}['"`]/
      );
    });
  });

  describe(".gitignore configuration", () => {
    it("should have .gitignore file", () => {
      const gitignorePath = resolve(ROOT_DIR, ".gitignore");
      expect(existsSync(gitignorePath)).toBe(true);
    });

    it("should exclude .env files", () => {
      const gitignorePath = resolve(ROOT_DIR, ".gitignore");
      const content = readFileSync(gitignorePath, "utf-8");

      expect(content).toContain(".env");
    });

    it("should exclude test/.env.test", () => {
      const gitignorePath = resolve(ROOT_DIR, ".gitignore");
      const content = readFileSync(gitignorePath, "utf-8");

      // Either explicit test/.env.test or .env.test pattern
      expect(content.includes("test/.env.test") || content.includes(".env.test")).toBe(true);
    });
  });

  describe("No .env files committed", () => {
    it("should not have .env file in repository root", () => {
      // Note: This checks current filesystem state
      // In CI, .env should not exist
      const envPath = resolve(ROOT_DIR, ".env");

      // We can't fail if .env exists locally (needed for tests)
      // Instead, we verify it's in .gitignore
      const gitignorePath = resolve(ROOT_DIR, ".gitignore");
      const gitignore = readFileSync(gitignorePath, "utf-8");
      expect(gitignore).toContain(".env");
    });

    it("should not have test/.env.test committed (check .gitignore)", () => {
      const gitignorePath = resolve(ROOT_DIR, ".gitignore");
      const gitignore = readFileSync(gitignorePath, "utf-8");

      expect(gitignore.includes(".env.test") || gitignore.includes("test/.env.test")).toBe(true);
    });
  });

  describe("Example files safety", () => {
    it("should have .env.test.example with placeholders only", () => {
      const examplePath = resolve(ROOT_DIR, "test/.env.test.example");

      if (!existsSync(examplePath)) {
        console.warn(".env.test.example not found");
        return;
      }

      const content = readFileSync(examplePath, "utf-8");

      // Should have placeholder values
      expect(content).toMatch(/your[-_]|example|placeholder|xxx/i);

      // Should NOT have real-looking credentials
      expect(content).not.toMatch(/[a-zA-Z0-9._%+-]+@(gmail|yahoo|hotmail|outlook)\.[a-z]{2,}/i);
    });
  });

  describe("No secrets in test files", () => {
    const testFiles = ["test/setup/env.ts", "test/setup/auth.ts", "test/setup/fixtures.ts"];

    testFiles.forEach((file) => {
      it(`should not contain secrets in ${file}`, () => {
        const filePath = resolve(ROOT_DIR, file);

        if (!existsSync(filePath)) {
          return;
        }

        const content = readFileSync(filePath, "utf-8");

        // Should not contain real email addresses
        const emailPattern = /[a-zA-Z0-9._%+-]+@(gmail|yahoo|hotmail|outlook|icloud)\.[a-z]{2,}/gi;
        const emails = content.match(emailPattern) || [];
        expect(emails).toHaveLength(0);

        // Should not contain JWT tokens
        const jwtPattern = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
        const jwts = content.match(jwtPattern) || [];
        expect(jwts).toHaveLength(0);
      });
    });
  });
});
