import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Tests mock solid-js/store and run against real core graph in Node.
    environment: "node",
  },
});
