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
    "react",
    "react-dom",
    "zustand",
    "zustand/vanilla",
    "immer",
  ],
  treeshake: true,
  sourcemap: true,
  clean: true,
});
