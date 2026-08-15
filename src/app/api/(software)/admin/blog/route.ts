import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import {
  createBlog,
  deleteBlog,
  listBlogs,
  updateBlog,
} from "@/lib/blog";
import { BLOG_STATUSES } from "@/lib/blog/types";
import { formatZodError } from "@/lib/utils";

const listQuerySchema = z.object({
  status: z.enum(["all", "draft", "published"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(10).max(100_000),
  status: z.enum(BLOG_STATUSES).default("draft"),
  slug: z.string().trim().max(100).optional(),
  excerpt: z.string().trim().max(400).optional(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  coverImageUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
});

/** List blogs. Admin-only. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = listQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const result = await listBlogs(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/blog:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Create blog. Admin-only. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    try {
      const post = await createBlog({
        ...parsed.data,
        coverImageUrl: parsed.data.coverImageUrl ?? null,
        authorId: auth.user.id,
        authorEmail: auth.user.email,
      });
      return NextResponse.json({ post }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cover image")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("POST /api/admin/blog:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const patchSchema = createSchema.partial().extend({
  id: z.string().trim().min(1),
});

/** Update blog. Admin-only. */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const { id, ...rest } = parsed.data;
    try {
      const post = await updateBlog(id, rest);
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      return NextResponse.json({ post });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cover image")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/admin/blog:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  id: z.string().trim().min(1),
});

/** Delete blog. Admin-only. */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const ok = await deleteBlog(parsed.data.id);
    if (!ok) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/blog:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
