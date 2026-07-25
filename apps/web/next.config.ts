import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@money-matters/ui",
    "@money-matters/i18n",
    "@money-matters/types",
    "@money-matters/capability-notifications",
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
