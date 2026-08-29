import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  entry: {
    index: "src/index.ts",
    devtools: "src/devtools/index.ts",
  },
  // Externalize peers + the optional CRDT/Tauri/AG-UI deps so core stays lean.
  external: [
    "zustand", "zustand/vanilla", "zustand/middleware", "zustand/middleware/immer",
    "immer", "loro-crdt", "@ag-ui/core", "@tauri-apps/plugin-sql",
  ],
});
