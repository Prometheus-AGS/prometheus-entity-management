import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  external: [
    "alpinejs",
    "@prometheus-ags/entity-graph-core",
    "zustand",
    "zustand/vanilla",
    "immer",
  ],
});
