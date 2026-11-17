import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["unit/**/*.test.js", "dom/**/*.test.js"],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["helpers/**/*.js", "setup/**/*.js"],
    },
  },
});