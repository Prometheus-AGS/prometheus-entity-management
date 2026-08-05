import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: [
      ...configDefaults.exclude,
      "src/adapters/flint-live.integration.test.ts",
    ],
    environment: "node",
  },
});
