import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Imagens coladas ou arrastadas (até 10 MB) e backups importados (até 50 MB) vão por Server Action.
    serverActions: { bodySizeLimit: "52mb" },
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
