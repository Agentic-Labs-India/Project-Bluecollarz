import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { listPublishedBlogsPublic } from "@/lib/blog";
import { formatDateTimeShort } from "@/lib/dates";

export const metadata = {
  title: "Blog · Blucollarz",
  description:
    "Product updates, hiring insights, and guides from Blucollarz — AI-native hiring for skilled candidates and recruiters.",
};

const PAGE_SIZE = 10;

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

function BlogIndexBodyFallback() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-4">
          <div className="bg-muted aspect-video w-full" />
          <div className="bg-muted h-3 w-24 rounded" />
          <div className="bg-muted h-7 w-4/5 rounded" />
          <div className="bg-muted h-4 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

async function BlogIndexBody({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { items, pageCount, total } = await listPublishedBlogsPublic({
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className="mt-10 w-full">
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No published posts yet. Check back soon.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-2">
          {items.map((post) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block space-y-4 transition-opacity hover:opacity-90"
              >
                {post.coverImageUrl ? (
                  <div className="border-border relative aspect-video w-full overflow-hidden border">
                    <Image
                      src={post.coverImageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="border-border bg-muted/40 aspect-video w-full border" />
                )}
                <div className="min-w-0 space-y-2">
                  <p className="text-mute text-xs tabular-nums">
                    {post.publishedAt
                      ? formatDateTimeShort(post.publishedAt)
                      : formatDateTimeShort(post.createdAt)}
                  </p>
                  <h2 className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                    {post.title}
                  </h2>
                  {post.excerpt ? (
                    <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed sm:text-[15px]">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav
          className="border-border mt-12 flex items-center justify-between gap-4 border-t pt-6"
          aria-label="Blog pagination"
        >
          {page > 1 ? (
            <Link
              href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}
              className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
              rel="prev"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <p className="text-mute text-xs tabular-nums">
            Page {page} of {pageCount} · {total} posts
          </p>
          {page < pageCount ? (
            <Link
              href={`/blog?page=${page + 1}`}
              className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
              rel="next"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

export default function BlogIndexPage({ searchParams }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pb-24 md:pt-32">
      <header className="border-border w-full space-y-4 border-b pb-8 md:pb-10">
        <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.1]">
          Blog
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg">
          Updates and guides from the Blucollarz team. Newest posts first.
        </p>
      </header>

      <Suspense fallback={<BlogIndexBodyFallback />}>
        <BlogIndexBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
