import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Array form, and the SUBPATH entry must come first: Vite matches aliases
    // in order and applies a prefix replacement. With only the bare specifier
    // mapped, "@prometheus-ags/entity-graph-core/devtools" rewrote to
    // ".../src/index.ts/devtools" — a path that cannot exist — so every suite
    // transitively importing the devtools entrypoint failed to resolve.
    //
    // The package's own `exports` map already declares "./devtools" correctly
    // and dist/devtools.{mjs,cjs,d.ts} are all built. This alias only governs
    // how the test runner reaches source instead of dist.
    alias: [
      {
        find: "@prometheus-ags/entity-graph-core/devtools",
        replacement: fileURLToPath(
          new URL("../entity-graph-core/src/devtools/index.ts", import.meta.url),
        ),
      },
      {
        find: "@prometheus-ags/entity-graph-core",
        replacement: fileURLToPath(
          new URL("../entity-graph-core/src/index.ts", import.meta.url),
        ),
      },
    ],
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "jsdom",
  },
});
