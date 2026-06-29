import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The library resolves via the workspace dependency (built dist);
  // transpilePackages lets Next compile it as part of the app graph.
  transpilePackages: ["@prometheus-ags/prometheus-entity-management"],
};

export default nextConfig;
