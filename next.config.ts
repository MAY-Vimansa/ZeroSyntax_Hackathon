import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.FLEXIROVA_DIST_DIR || ".next",
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: process.cwd() },
  serverExternalPackages: [],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=()",
          },
        ],
      },
    ];
  },
};
export default config;
