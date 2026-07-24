export const BLOG_STATUSES = ["draft", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export type BlogListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  status: BlogStatus;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogDetail = BlogListItem & {
  content: string;
  authorId: string;
  authorEmail: string;
};

/** Slug for URLs — lowercase, hyphenated, ASCII-ish. */
export function slugifyBlogTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
