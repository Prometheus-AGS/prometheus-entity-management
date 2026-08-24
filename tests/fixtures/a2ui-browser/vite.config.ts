import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const fixtureRoot = resolve(import.meta.dirname);
const workspaceRoot = resolve(fixtureRoot, "../../..");

export default defineConfig({
  root: fixtureRoot,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4177,
    strictPort: true,
    fs: { allow: [workspaceRoot] },
  },
  preview: {
    host: "127.0.0.1",
    port: 4177,
    strictPort: true,
  },
});
