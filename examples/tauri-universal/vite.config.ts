import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@prometheus-ags/entity-graph-core": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-core/src/index.ts",
      ),
      "@prometheus-ags/prometheus-entity-management": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-react/src/index.ts",
      ),
      "@prometheus-ags/entity-graph-tauri": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-tauri/src/index.ts",
      ),
    },
    dedupe: ["react", "react-dom", "zustand"],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host ?? false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
