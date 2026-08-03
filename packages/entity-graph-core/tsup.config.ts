import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  // Externalize peers + the optional CRDT/Tauri/AG-UI deps so core stays lean.
  external: [
    "zustand", "zustand/vanilla", "zustand/middleware", "zustand/middleware/immer",
    "immer", "loro-crdt", "@ag-ui/core", "@tauri-apps/plugin-sql",
  ],
});
