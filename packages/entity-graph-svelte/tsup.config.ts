import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  external: [
    "svelte",
    "svelte/store",
    "svelte/reactivity",
    "@prometheus-ags/entity-graph-core",
    "zustand",
    "zustand/vanilla",
    "immer",
  ],
});
