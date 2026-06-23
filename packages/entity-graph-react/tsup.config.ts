import { defineConfig } from "tsup";

export default defineConfig({
  // Single public API entry — everything flows through src/index.ts
  entry: ["src/index.ts"],

  // Dual-format output: ESM for modern bundlers, CJS for older toolchains/Jest
  format: ["esm", "cjs"],

  // Generate .d.ts declaration files alongside each format
  dts: true,

  // .mjs (ESM) + .js (CJS) — no root package.json "type" field required
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },

  // Mark all peer deps and direct deps as external — consumers install them.
  // The library itself does not bundle any third-party code.
  external: [
    // React family
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    // Zustand (all sub-paths)
    "zustand",
    "zustand/middleware",
    "zustand/middleware/immer",
    "zustand/react",
    "zustand/react/shallow",
    // State utilities
    "immer",
    // UI utilities
    "lucide-react",
    "clsx",
    "tailwind-merge",
    // Optional peer — TanStack Table (legacy entity-table/columns only)
    "@tanstack/react-table",
  ],

  // Remove dead code before shipping
  treeshake: true,

  // Sourcemaps for debuggability in consumer apps
  sourcemap: true,

  // Always start clean
  clean: true,

  // TypeScript compilation — picks up tsconfig.json automatically
  // No minification: let the consumer's bundler decide
  minify: false,
});
