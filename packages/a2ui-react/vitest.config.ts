import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: [],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
