import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  // isomorphic-dompurify → jsdom must stay external; bundling breaks CJS/ESM on Vercel.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  // Expose DB_NAME to client bundles so blob pathnames stay rooted under it.
  env: {
    DB_NAME: process.env.DB_NAME,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
