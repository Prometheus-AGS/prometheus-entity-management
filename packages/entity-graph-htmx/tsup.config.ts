import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  external: [
    "@prometheus-ags/entity-graph-core",
    "@prometheus-ags/entity-graph-sdl",
    "zustand",
    "immer",
  ],
  // Node built-ins: mark as external so the bundle stays thin
  noExternal: [],
  platform: "node",
  target: "node18",
});
