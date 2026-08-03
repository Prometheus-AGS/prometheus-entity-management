import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  entry: {
    index: "src/index.ts",
    "ag-ui": "src/ag-ui/index.ts",
  },
  // The official web_core package is ESM-only while this repository promises a
  // working CommonJS artifact. Bundle the exact official implementation into
  // both outputs; React and the canonical graph remain external singletons.
  noExternal: [/^@a2ui\//],
  external: [
    "@prometheus-ags/entity-graph-core",
    "react",
    "react-dom",
    "zustand",
    "zustand/vanilla",
    "immer",
    "zod",
  ],
});
