import type { NextConfig } from "next";
import { STORY_SECURITY_HEADERS } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Next.js 16 blocks cross-origin /_next/* in `next dev` by default.
  // Without this, the seller portal SSR-renders but never hydrates — buttons do nothing.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
    "*.loca.lt",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(STORY_SECURITY_HEADERS).map(
          ([key, value]) => ({ key, value }),
        ),
      },
    ];
  },
};

export default nextConfig;
