import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4181,
    strictPort: true,
  },
  preview: {
    port: 4181,
    strictPort: true,
  },
});
