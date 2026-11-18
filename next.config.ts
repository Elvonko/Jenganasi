import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
  outputFileTracingIncludes: {
    "/*": ["./src/db/migrations/**/*.sql"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
