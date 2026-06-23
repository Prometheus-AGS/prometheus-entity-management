import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
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
  treeshake: true,
  sourcemap: true,
  clean: true,
});
