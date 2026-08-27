import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  // Prefetch one reusable App Shell per route instead of one prefetch per
  // visible link. Requires cacheComponents. https://nextjs.org/docs/app/api-reference/config/next-config-js/partialPrefetching
  partialPrefetching: true,
  // Expose DB_NAME to client bundles so blob pathnames stay rooted under it.
  env: {
    DB_NAME: process.env.DB_NAME,
  },
  serverExternalPackages: ["unpdf", "pdf-parse"],
  transpilePackages: [
    "@capacitor/core",
    "@capacitor/app",
    "@capacitor/keyboard",
    "@capacitor/status-bar",
    "@capacitor/splash-screen",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
