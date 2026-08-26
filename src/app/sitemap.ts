import type { MetadataRoute } from "next";
import { listPublishedBlogsForSitemap } from "@/lib/blog";
import { listPublishedJobsForSitemap } from "@/lib/jobs/queries";

const BASE_URL =
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
  "https://www.blucollarz.com";

/** Stable lastModified for evergreen marketing pages (avoids crawl churn). */
const STATIC_LAST_MODIFIED = new Date("2026-07-01T00:00:00.000Z");

const STATIC_PATHS = [
  "/",
  "/about",
  "/mission",
  "/vision",
  "/for-recruiters",
  "/contact",
  "/privacy",
  "/terms",
  "/grievance",
  "/blog",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path === "/" ? "/" : path}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: path === "/" || path === "/blog" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/blog" ? 0.8 : 0.6,
  }));

  let blogEntries: MetadataRoute.Sitemap = [];
  let jobEntries: MetadataRoute.Sitemap = [];

  try {
    const [blogs, jobs] = await Promise.all([
      listPublishedBlogsForSitemap(),
      listPublishedJobsForSitemap(),
    ]);

    blogEntries = blogs.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    jobEntries = jobs.map((job) => ({
      url: `${BASE_URL}/jobs/${job.id}`,
      lastModified: new Date(job.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));
  } catch {
    // Mongo may be unavailable at build; serve static URLs only.
  }

  return [...staticEntries, ...blogEntries, ...jobEntries];
}
