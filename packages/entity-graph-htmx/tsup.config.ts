import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
  external: [
    "@prometheus-ags/entity-graph-core",
    "@prometheus-ags/entity-graph-sdl",
    "zustand",
    "immer",
  ],
  treeshake: true,
  sourcemap: true,
  clean: true,
  // Node built-ins: mark as external so the bundle stays thin
  noExternal: [],
  platform: "node",
  target: "node18",
});
