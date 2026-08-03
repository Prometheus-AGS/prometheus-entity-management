import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const exampleRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@prometheus-ags/entity-graph-core": `${workspaceRoot}/packages/entity-graph-core/src/index.ts`,
    },
  },
  test: {
    environment: "node",
    include: [`${exampleRoot}/src/**/*.test.ts`],
    pool: "forks",
  },
});
