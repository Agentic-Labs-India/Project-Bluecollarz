import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  async redirects() {
    return [
      {
        source: "/admin/rights",
        destination: "/admin/compliance",
        permanent: false,
      },
      {
        source: "/admin/breaches",
        destination: "/admin/compliance?tab=breaches",
        permanent: false,
      },
      {
        source: "/admin/jobs",
        destination: "/admin/recruiters?tab=jobs",
        permanent: false,
      },
      {
        source: "/admin/inquiries",
        destination: "/admin/recruiters?tab=inquiries",
        permanent: false,
      },
      {
        source: "/admin/admins",
        destination: "/admin/settings",
        permanent: false,
      },
    ];
  },
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
        hostname: "cdn.sanity.io",
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
