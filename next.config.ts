import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only route badge overlaps the mobile tab bar / top bar at every position.
  // Error overlays still show when this is off.
  devIndicators: false,
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
