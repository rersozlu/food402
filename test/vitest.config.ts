import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: true,
    reporter: "verbose",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["shared/**/*.ts", "src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/types.ts"],
    },
  },
});
