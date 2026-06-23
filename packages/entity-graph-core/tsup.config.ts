import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
  // Externalize peers + the optional CRDT/Tauri/AG-UI deps so core stays lean.
  external: [
    "zustand", "zustand/vanilla", "zustand/middleware", "zustand/middleware/immer",
    "immer", "loro-crdt", "@ag-ui/core", "@tauri-apps/plugin-sql",
  ],
  treeshake: true,
  sourcemap: true,
  clean: true,
});
