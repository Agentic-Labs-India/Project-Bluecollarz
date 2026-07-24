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

export type SeoTitleScoreLevel = "bad" | "good" | "excellent";

export type SeoTitleScore = {
  level: SeoTitleScoreLevel;
  label: "Bad" | "Good" | "Excellent";
  length: number;
  /** Short hint for editors (e.g. "Aim for 50–60 characters"). */
  hint: string;
};

/**
 * Google-style SERP title length score.
 * Excellent ≈ 50–60 chars; Good ≈ 30–49 or 61–65; Bad = empty / too short / too long.
 */
export function scoreSeoTitle(title: string): SeoTitleScore {
  const length = Array.from(title.trim()).length;

  if (length === 0) {
    return {
      level: "bad",
      label: "Bad",
      length,
      hint: "Add a title — aim for 50–60 characters.",
    };
  }
  if (length >= 50 && length <= 60) {
    return {
      level: "excellent",
      label: "Excellent",
      length,
      hint: "Great length for search results.",
    };
  }
  if ((length >= 30 && length <= 49) || (length >= 61 && length <= 65)) {
    return {
      level: "good",
      label: "Good",
      length,
      hint:
        length < 50
          ? "A bit short — closer to 50–60 often ranks clearer."
          : "Slightly long — may truncate in Google (~60 chars).",
    };
  }
  return {
    level: "bad",
    label: "Bad",
    length,
    hint:
      length < 30
        ? "Too short — expand toward 50–60 characters."
        : "Too long — Google may cut this past ~60 characters.",
  };
}
