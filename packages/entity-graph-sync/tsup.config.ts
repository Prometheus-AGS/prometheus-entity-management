import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
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
  treeshake: true,
  sourcemap: true,
  clean: true,
});
