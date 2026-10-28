import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The lab resolves the workspace packages from source, like the other examples,
// so it exercises the runtime as it is in this working tree.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@prometheus-ags/a2ui-react": path.resolve(
        import.meta.dirname,
        "../../packages/a2ui-react/src/index.ts",
      ),
      "@prometheus-ags/entity-graph-core/devtools": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-core/src/devtools/index.ts",
      ),
      "@prometheus-ags/entity-graph-core": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-core/src/index.ts",
      ),
      "@prometheus-ags/entity-graph-react": path.resolve(
        import.meta.dirname,
        "../../packages/entity-graph-react/src/index.ts",
      ),
    },
  },
  server: { port: 5175 },
});
