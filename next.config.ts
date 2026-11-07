import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Dev-only route badge overlaps the mobile tab bar / top bar at every position.
  // Error overlays still show when this is off.
  devIndicators: false,
  // Categories moved from /settings/categories to /categories (stage 2); keep old links working.
  async redirects() {
    return [{ source: "/settings/categories", destination: "/categories", permanent: false }];
  },
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

// next-intl without i18n routing; request config in src/i18n/request.ts
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
