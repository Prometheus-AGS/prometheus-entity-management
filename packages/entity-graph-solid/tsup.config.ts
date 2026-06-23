import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
  // Core and solid-js are peer deps — never bundle them.
  external: [
    "@prometheus-ags/entity-graph-core",
    "solid-js",
    "solid-js/store",
    "solid-js/web",
  ],
  treeshake: true,
  sourcemap: true,
  clean: true,
});
