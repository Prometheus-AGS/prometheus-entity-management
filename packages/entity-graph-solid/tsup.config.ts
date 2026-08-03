import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  // Core and solid-js are peer deps — never bundle them.
  external: [
    "@prometheus-ags/entity-graph-core",
    "solid-js",
    "solid-js/store",
    "solid-js/web",
  ],
});
