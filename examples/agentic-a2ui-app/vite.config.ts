import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@prometheus-ags/a2ui-react": path.resolve(
        import.meta.dirname,
        "../../packages/a2ui-react/src/index.ts",
      ),
      "@prometheus-ags/entity-graph-a2a": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-a2a/src/index.ts",
      ),
      "@prometheus-ags/entity-graph-core/devtools": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-core/src/devtools/index.ts",
      ),
      "@prometheus-ags/entity-graph-core": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-core/src/index.ts",
      ),
      "@prometheus-ags/prometheus-entity-management": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-react/src/index.ts",
      ),
    },
  },
  server: {
    port: 5174,
  },
});
