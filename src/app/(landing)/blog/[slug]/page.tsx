import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BlogPostCta } from "@/components/landing/blog-post-cta";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getBlogBySlug } from "@/lib/blog";
import {
  blobAbsoluteFileUrl,
  blobFileUrl,
} from "@/lib/blob/pathname";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatBlogDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug, { publishedOnly: true });
  if (!post) {
    return { title: "Post · Blucollarz" };
  }
  const title = `${post.seoTitle || post.title} · Blucollarz`;
  const description = post.seoDescription || post.excerpt;
  const cover = post.coverImageUrl
    ? blobAbsoluteFileUrl(post.coverImageUrl)
    : null;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

function BlogPostBodyFallback() {
  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
      <div className="border-border animate-pulse space-y-4 border-b pb-8 lg:border-b-0 lg:border-e lg:pe-10 lg:pb-0">
        <div className="bg-muted h-3 w-24 rounded" />
        <div className="bg-muted h-12 w-full rounded" />
        <div className="bg-muted h-10 w-28 rounded" />
      </div>
      <div className="animate-pulse space-y-5 pt-8 lg:ps-12 lg:pt-0 xl:ps-14">
        <div className="bg-muted h-4 w-44 rounded" />
        <div className="bg-muted h-14 w-[85%] rounded" />
        <div className="bg-muted mt-10 aspect-video w-full rounded" />
      </div>
    </div>
  );
}

async function BlogPostBody({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug, { publishedOnly: true });
  if (!post) notFound();

  const publishedLabel = formatBlogDate(post.publishedAt ?? post.createdAt);

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
      <div className="border-border mb-10 border-b pb-8 lg:mb-0 lg:border-b-0 lg:border-e lg:pe-10 lg:pb-0 xl:pe-12">
        <BlogPostCta />
      </div>

      <article className="min-w-0 lg:ps-12 xl:ps-14">
        <nav
          aria-label="Breadcrumb"
          className="text-mute mb-6 flex flex-wrap items-center gap-x-2 text-sm"
        >
          <Link
            href="/blog"
            className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeftIcon
              className="size-3.5 shrink-0 opacity-70"
              aria-hidden
            />
            Blog
          </Link>
          <span className="opacity-50" aria-hidden>
            /
          </span>
          <span className="tabular-nums">{publishedLabel}</span>
        </nav>

        <header className="border-border space-y-5 border-b pb-10 md:pb-12">
          <h1 className="font-heading text-foreground text-[2rem] font-semibold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.08]">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg sm:leading-relaxed">
              {post.excerpt}
            </p>
          ) : null}
        </header>

        {post.coverImageUrl ? (
          <div className="relative mt-10 aspect-video w-full overflow-hidden bg-muted/30">
            <Image
              src={blobFileUrl(post.coverImageUrl)}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 720px"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="mt-10 max-w-2xl text-sm leading-relaxed sm:mt-12 sm:text-[15px]">
          <RichTextContent
            html={post.content}
            className="text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground space-y-5 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:my-1.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:leading-[1.75] [&_ul]:list-disc [&_ul]:ps-5"
          />
        </div>
      </article>
    </div>
  );
}

export default function BlogPostPage({ params }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pb-28 md:pt-32">
      <Suspense fallback={<BlogPostBodyFallback />}>
        <BlogPostBody params={params} />
      </Suspense>
    </main>
  );
}
