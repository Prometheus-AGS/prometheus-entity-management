import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  external: [
    "lit",
    "lit/decorators.js",
    "lit/directives/repeat.js",
    "lit/directives/class-map.js",
    "@lit/reactive-element",
    "@prometheus-ags/entity-graph-core",
    "zustand",
    "zustand/vanilla",
    "immer",
  ],
});
