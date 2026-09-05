import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  entry: {
    index: "src/index.ts",
    devtools: "src/devtools/index.ts",
    "devtools/auto": "src/devtools/auto.ts",
  },
  // `devtools/auto` is a SIDE-EFFECT entrypoint: importing it mounts the
  // devtools host. The shared config enables treeshake, which drops a bare
  // `import "…"` from a re-export shim because nothing in this package
  // references it — leaving an entrypoint that resolves but does nothing.
  // Verified by inspecting dist/devtools/auto.mjs on the first build.
  treeshake: false,
  external: [
    "react",
    "react-dom",
    "react-dom/client",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "@prometheus-ags/entity-graph-react",
    "@prometheus-ags/entity-graph-react/devtools",
    "@prometheus-ags/entity-graph-react/devtools/auto",
    "@prometheus-ags/entity-graph-core",
    "@prometheus-ags/entity-graph-core/devtools",
  ],
});
