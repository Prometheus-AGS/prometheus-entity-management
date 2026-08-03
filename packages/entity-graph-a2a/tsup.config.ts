import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  entry: {
    index: "src/index.ts",
    legacy: "src/legacy/index.ts",
  },
  external: [
    /^@a2a-js\/sdk(?:\/.*)?$/,
    "@prometheus-ags/entity-graph-core",
    "zustand",
    "zustand/vanilla",
    "immer",
  ],
});
