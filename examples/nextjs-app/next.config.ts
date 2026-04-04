import type { NextConfig } from "next";
import path from "path";

const libraryRoot = path.resolve(__dirname, "../../src/index.ts");
/** Relative to this package root — required for Turbopack (absolute paths break resolve). */
const libraryRootRelative = "../../src/index.ts";

const nextConfig: NextConfig = {
  transpilePackages: ["@prometheus-ags/prometheus-entity-management"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@prometheus-ags/prometheus-entity-management": libraryRoot,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      "@prometheus-ags/prometheus-entity-management": libraryRootRelative,
    },
  },
};

export default nextConfig;
