import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["prometheus-entity-management"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "prometheus-entity-management": path.resolve(
        __dirname,
        "../../src/index.ts"
      ),
    };
    return config;
  },
};

export default nextConfig;
