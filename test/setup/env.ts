// test/setup/env.ts - Environment variable loading for tests
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from test/.env.test or root .env
const testEnvPath = resolve(__dirname, "../.env.test");
const rootEnvPath = resolve(__dirname, "../../.env");

if (existsSync(testEnvPath)) {
  config({ path: testEnvPath });
} else if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
} else {
  console.warn(
    "No .env.test or .env file found. Tests requiring credentials will fail."
  );
}

export function validateEnv(): void {
  const required = ["TGO_EMAIL", "TGO_PASSWORD"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Create test/.env.test or .env with TGO_EMAIL and TGO_PASSWORD"
    );
  }
}

export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}
