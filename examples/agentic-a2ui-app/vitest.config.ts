import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const exampleRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@prometheus-ags/a2ui-react": `${workspaceRoot}/packages/a2ui-react/src/index.ts`,
      "@prometheus-ags/entity-graph-a2a": `${workspaceRoot}/packages/entity-graph-a2a/src/index.ts`,
      "@prometheus-ags/entity-graph-core": `${workspaceRoot}/packages/entity-graph-core/src/index.ts`,
      "@prometheus-ags/prometheus-entity-management": `${workspaceRoot}/packages/entity-graph-react/src/index.ts`,
    },
  },
  test: {
    environment: "jsdom",
    include: [`${exampleRoot}/src/**/*.test.{ts,tsx}`],
    pool: "forks",
    sequence: { concurrent: false },
  },
});
