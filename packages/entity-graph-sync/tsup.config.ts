import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  // Externalize the core graph + all optional peer deps so the bundle stays lean.
  external: [
    "@prometheus-ags/entity-graph-core",
    "zustand",
    "zustand/vanilla",
    "immer",
    "yjs",
    "y-websocket",
    "y-webrtc",
    "loro-crdt",
  ],
});
