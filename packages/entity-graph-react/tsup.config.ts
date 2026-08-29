import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  entry: {
    index: "src/index.ts",
    devtools: "src/devtools/index.ts",
    "devtools/auto": "src/devtools/auto.tsx",
  },
  // Mark all peer deps and direct deps as external — consumers install them.
  // The library itself does not bundle any third-party code.
  external: [
    // React family
    "react",
    "react-dom",
    "react-dom/client",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    // Optional framework-neutral DevTools protocol/controller surface.
    "@prometheus-ags/entity-graph-core",
    "@prometheus-ags/entity-graph-core/devtools",
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
    // Runtime dependency — root exports include the legacy entity-table/columns.
    "@tanstack/react-table",
    "@tanstack/react-virtual",
  ],

  // No minification: let the consumer's bundler decide
  minify: false,
});
