import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
  "https://www.blucollarz.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/blog",
          "/blog/",
          "/jobs",
          "/jobs/",
          "/privacy",
          "/terms",
          "/grievance",
          "/about",
          "/contact",
        ],
        disallow: ["/auth", "/candidate", "/hire", "/admin", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
