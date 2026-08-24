import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  // The library resolves via the workspace dependency (built dist);
  // transpilePackages lets Next compile it as part of the app graph.
  transpilePackages: ["@prometheus-ags/prometheus-entity-management"],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
