import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only badge; bottom positions overlap the mobile tab bar.
  devIndicators: { position: "top-right" },
  cacheComponents: true,
  partialPrefetching: true,
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
