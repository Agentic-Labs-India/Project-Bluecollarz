import "server-only";

import { ObjectId } from "mongodb";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { deleteBlobUrls } from "@/lib/blob/server/delete";
import { isBlogCoverImageUrl } from "@/lib/blob/pathname";
import {
  type BlogDetail,
  type BlogDocument,
  type BlogListItem,
  type BlogStatus,
  slugifyBlogTitle,
} from "@/lib/blog/types";
import { htmlToPlainText, sanitizeRichTextHtml } from "@/lib/core/rich-text";
import client, { COLLECTIONS, DB_NAME, isId, matchId } from "@/lib/db";
import { ensureIndexes } from "@/lib/db/indexes";
import { idHex } from "@/lib/utils";

export type {
  BlogDetail,
  BlogListItem,
  BlogStatus,
  SeoTitleScore,
  SeoTitleScoreLevel,
} from "@/lib/blog/types";
export {
  BLOG_STATUSES,
  scoreSeoTitle,
  slugifyBlogTitle,
} from "@/lib/blog/types";

const PUBLISHED_BLOGS_CACHE_TAG = "published-blogs";

/** ~1 day revalidate; stale-while-revalidate for 1h; expire after 1 week idle. */
const BLOG_CACHE_LIFE = {
  stale: 3600,
  revalidate: 86400,
  expire: 604800,
} as const;

const BLOG_LIST_PROJECTION = {
  slug: 1,
  title: 1,
  excerpt: 1,
  coverImageUrl: 1,
  status: 1,
  seoTitle: 1,
  seoDescription: 1,
  publishedAt: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

function revalidatePublishedBlogsCache() {
  revalidateTag(PUBLISHED_BLOGS_CACHE_TAG, "max");
}

type BlogDoc = BlogDocument;

function excerptFromContent(content: string, max = 180): string {
  const plain = htmlToPlainText(content).replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trimEnd()}…`;
}

function normalizeCoverImageUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() || "";
  if (!trimmed) return null;
  if (!isBlogCoverImageUrl(trimmed)) {
    throw new Error("Cover image must be a Blucollarz blog blob URL");
  }
  return trimmed;
}

function toListItem(doc: {
  _id: unknown;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string | null;
  status: BlogStatus;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): BlogListItem {
  return {
    id: idHex(doc._id),
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    coverImageUrl: doc.coverImageUrl ?? null,
    status: doc.status,
    seoTitle: doc.seoTitle || doc.title,
    seoDescription: doc.seoDescription || doc.excerpt,
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toDetail(doc: BlogDoc): BlogDetail {
  return {
    ...toListItem(doc),
    content: doc.content,
    authorId: doc.authorId,
    authorEmail: doc.authorEmail,
  };
}

/**
 * Title-based unique slug: `my-post`, then `my-post-1`, `my-post-2`, …
 * when the base slug is already taken.
 */
async function uniqueSlugFromTitle(
  title: string,
  excludeId?: string,
): Promise<string> {
  const root = slugifyBlogTitle(title) || "post";
  const col = client.db(DB_NAME).collection<BlogDoc>(COLLECTIONS.BLOGS);
  let candidate = root;
  let n = 1;
  for (;;) {
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId && isId(excludeId)) {
      filter._id = { $ne: new ObjectId(excludeId) };
    }
    const existing = await col.findOne(filter, { projection: { _id: 1 } });
    if (!existing) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
    if (n > 50) return `${root}-${Date.now().toString(36)}`;
  }
}

export async function listBlogs(opts?: {
  status?: BlogStatus | "all";
  limit?: number;
  page?: number;
}): Promise<{
  items: BlogListItem[];
  total: number;
  page: number;
  pageCount: number;
}> {
  await ensureIndexes();
  const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 50);
  const page = Math.max(opts?.page ?? 1, 1);
  const filter =
    opts?.status && opts.status !== "all" ? { status: opts.status } : {};

  const col = client.db(DB_NAME).collection<BlogDoc>(COLLECTIONS.BLOGS);
  const [total, docs] = await Promise.all([
    col.countDocuments(filter),
    col
      .find(filter, { projection: BLOG_LIST_PROJECTION })
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
  ]);

  return {
    items: docs.map(toListItem),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Cached published list for the public /blog index. */
export async function listPublishedBlogsPublic(opts: {
  page?: number;
  limit?: number;
}): Promise<{
  items: BlogListItem[];
  total: number;
  page: number;
  pageCount: number;
}> {
  "use cache";
  cacheLife(BLOG_CACHE_LIFE);
  cacheTag(PUBLISHED_BLOGS_CACHE_TAG);

  // Indexes ensured on write paths; skip full ensure on cache miss for speed.
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
  const page = Math.max(opts.page ?? 1, 1);
  const filter = { status: "published" as const };
  const col = client.db(DB_NAME).collection<BlogDoc>(COLLECTIONS.BLOGS);

  const [total, docs] = await Promise.all([
    col.countDocuments(filter),
    col
      .find(filter, { projection: BLOG_LIST_PROJECTION })
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
  ]);

  return {
    items: docs.map(toListItem),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listPublishedBlogsForSitemap(): Promise<
  { slug: string; updatedAt: string }[]
> {
  "use cache";
  cacheLife(BLOG_CACHE_LIFE);
  cacheTag(PUBLISHED_BLOGS_CACHE_TAG);

  const docs = await client
    .db(DB_NAME)
    .collection<BlogDoc>(COLLECTIONS.BLOGS)
    .find({ status: "published" }, { projection: { slug: 1, updatedAt: 1 } })
    .sort({ publishedAt: -1 })
    .limit(500)
    .toArray();
  return docs.map((d) => ({
    slug: d.slug,
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function getBlogBySlug(
  slug: string,
  opts?: { publishedOnly?: boolean },
): Promise<BlogDetail | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;

  if (opts?.publishedOnly !== false) {
    return getPublishedBlogBySlugCached(clean);
  }

  await ensureIndexes();
  const doc = await client
    .db(DB_NAME)
    .collection<BlogDoc>(COLLECTIONS.BLOGS)
    .findOne({ slug: clean });
  return doc ? toDetail(doc) : null;
}

async function getPublishedBlogBySlugCached(
  slug: string,
): Promise<BlogDetail | null> {
  "use cache";
  cacheLife(BLOG_CACHE_LIFE);
  cacheTag(PUBLISHED_BLOGS_CACHE_TAG);

  const doc = await client
    .db(DB_NAME)
    .collection<BlogDoc>(COLLECTIONS.BLOGS)
    .findOne({ slug, status: "published" });
  return doc ? toDetail(doc) : null;
}

export async function getBlogById(id: string): Promise<BlogDetail | null> {
  if (!isId(id)) return null;
  await ensureIndexes();
  const doc = await client
    .db(DB_NAME)
    .collection<BlogDoc>(COLLECTIONS.BLOGS)
    .findOne({ _id: matchId(id) as never });
  return doc ? toDetail(doc) : null;
}

export async function createBlog(input: {
  title: string;
  content: string;
  status: BlogStatus;
  /** Ignored — public URL slug is always derived from the title. */
  slug?: string;
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
  coverImageUrl?: string | null;
  authorId: string;
  authorEmail: string;
}): Promise<BlogDetail> {
  await ensureIndexes();
  const title = input.title.trim();
  const content = sanitizeRichTextHtml(input.content);
  const excerpt = input.excerpt?.trim() || excerptFromContent(content);
  const slug = await uniqueSlugFromTitle(title);
  const coverImageUrl = normalizeCoverImageUrl(input.coverImageUrl);
  const now = new Date();
  const status = input.status;
  const _id = new ObjectId();
  const doc: BlogDoc = {
    _id,
    slug,
    title,
    excerpt,
    content,
    coverImageUrl,
    status,
    seoTitle: input.seoTitle?.trim() || title,
    seoDescription: input.seoDescription?.trim() || excerpt,
    authorId: input.authorId,
    authorEmail: input.authorEmail.trim().toLowerCase(),
    publishedAt: status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  await client
    .db(DB_NAME)
    .collection<BlogDoc>(COLLECTIONS.BLOGS)
    .insertOne(doc);
  if (status === "published") {
    revalidatePublishedBlogsCache();
  }
  return toDetail(doc);
}

export async function updateBlog(
  id: string,
  input: {
    title?: string;
    content?: string;
    status?: BlogStatus;
    /** Ignored — public URL slug is always derived from the title. */
    slug?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    /** Pass `null` or `""` to clear; omit to leave unchanged. */
    coverImageUrl?: string | null;
  },
): Promise<BlogDetail | null> {
  if (!isId(id)) return null;
  await ensureIndexes();
  const col = client.db(DB_NAME).collection<BlogDoc>(COLLECTIONS.BLOGS);
  const existing = await col.findOne({ _id: matchId(id) as never });
  if (!existing) return null;

  const title = input.title?.trim() ?? existing.title;
  const content =
    input.content !== undefined
      ? sanitizeRichTextHtml(input.content)
      : existing.content;
  const excerpt =
    input.excerpt?.trim() ||
    (input.content !== undefined
      ? excerptFromContent(content)
      : existing.excerpt);
  // Keep slug stable unless the title changed; then re-derive from title.
  const slug =
    title === existing.title
      ? existing.slug
      : await uniqueSlugFromTitle(title, id);
  const status = input.status ?? existing.status;
  const now = new Date();
  let publishedAt = existing.publishedAt;
  if (status === "published" && !publishedAt) publishedAt = now;

  const previousCover = existing.coverImageUrl ?? null;
  const nextCover =
    input.coverImageUrl !== undefined
      ? normalizeCoverImageUrl(input.coverImageUrl)
      : previousCover;

  const result = await col.findOneAndUpdate(
    { _id: matchId(id) as never },
    {
      $set: {
        title,
        content,
        excerpt,
        slug,
        status,
        coverImageUrl: nextCover,
        seoTitle: input.seoTitle?.trim() || existing.seoTitle || title,
        seoDescription:
          input.seoDescription?.trim() || existing.seoDescription || excerpt,
        publishedAt,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  if (previousCover && previousCover !== nextCover) {
    await deleteBlobUrls([previousCover]);
  }

  const touchedPublicSurface =
    existing.status === "published" || status === "published";
  if (touchedPublicSurface) {
    revalidatePublishedBlogsCache();
  }
  return result ? toDetail(result) : null;
}

export async function deleteBlog(id: string): Promise<boolean> {
  if (!isId(id)) return false;
  await ensureIndexes();
  const col = client.db(DB_NAME).collection<BlogDoc>(COLLECTIONS.BLOGS);
  const existing = await col.findOne({ _id: matchId(id) as never });
  if (!existing) return false;

  const result = await col.deleteOne({ _id: matchId(id) as never });
  if (result.deletedCount !== 1) return false;

  await deleteBlobUrls([existing.coverImageUrl]);
  if (existing.status === "published") {
    revalidatePublishedBlogsCache();
  }
  return true;
}
