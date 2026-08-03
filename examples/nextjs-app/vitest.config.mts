import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const exampleRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@prometheus-ags/entity-graph-core": `${workspaceRoot}/packages/entity-graph-core/src/index.ts`,
      "@prometheus-ags/prometheus-entity-management": `${workspaceRoot}/packages/entity-graph-react/src/index.ts`,
    },
  },
  test: {
    environment: "jsdom",
    include: [`${exampleRoot}/src/**/*.test.{ts,tsx}`],
    pool: "forks",
  },
});
