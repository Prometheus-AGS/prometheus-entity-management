import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  external: [
    "@tauri-apps/api",
    "@tauri-apps/plugin-sql",
    "@prometheus-ags/entity-graph-core",
    "zustand",
    "zustand/vanilla",
    "immer",
  ],
});
