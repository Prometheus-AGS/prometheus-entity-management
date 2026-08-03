import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
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

  // No minification: let the consumer's bundler decide
  minify: false,
});
