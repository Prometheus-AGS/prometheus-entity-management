import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const exampleRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  resolve: {
    // Array form, subpath entries FIRST. Vite matches string aliases in order
    // and applies a prefix replacement, so a bare-specifier alias rewrites
    // ".../devtools" to ".../src/index.ts/devtools" — a path that cannot exist.
    // `src/components/entity-graph-devtools.tsx` dynamically imports the
    // devtools subpath, so this ordering is load-bearing here, not defensive.
    alias: [
      {
        find: "@prometheus-ags/entity-graph-core/devtools",
        replacement: `${workspaceRoot}/packages/entity-graph-core/src/devtools/index.ts`,
      },
      {
        find: "@prometheus-ags/entity-graph-react/devtools",
        replacement: `${workspaceRoot}/packages/entity-graph-react/src/devtools/index.ts`,
      },
      {
        find: "@prometheus-ags/prometheus-entity-management/devtools",
        replacement: `${workspaceRoot}/packages/entity-graph-react/src/devtools/index.ts`,
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
      {
        find: "@prometheus-ags/entity-graph-core",
        replacement: `${workspaceRoot}/packages/entity-graph-core/src/index.ts`,
      },
      {
        find: "@prometheus-ags/entity-graph-react",
        replacement: `${workspaceRoot}/packages/entity-graph-react/src/index.ts`,
      },
      // The old name still resolves: it is a published compatibility alias, and
      // this example is one of the consumers proving the alias keeps working.
      {
        find: "@prometheus-ags/prometheus-entity-management",
        replacement: `${workspaceRoot}/packages/entity-graph-react/src/index.ts`,
      },
    ],
  },
  test: {
    environment: "jsdom",
    include: [`${exampleRoot}/src/**/*.test.{ts,tsx}`],
    // request-isolation.test.ts is a `node:test` suite, not a Vitest one. It
    // runs under its own script (`pnpm run test:ssr-isolation`) because it
    // proves SSR request isolation with no browser and no React renderer.
    // The glob above sweeps it in, where it reports "No test suite found".
    exclude: [`${exampleRoot}/src/lib/server/request-isolation.test.ts`],
    pool: "forks",
  },
});
