import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getBlogBySlug } from "@/lib/blog";
import { formatDateTimeShort } from "@/lib/dates";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug, { publishedOnly: true });
  if (!post) {
    return { title: "Post · BlueCollarz" };
  }
  const title = `${post.seoTitle || post.title} · BlueCollarz`;
  const description = post.seoDescription || post.excerpt;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(post.coverImageUrl
        ? { images: [{ url: post.coverImageUrl }] }
        : {}),
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

function BlogPostBodyFallback() {
  return (
    <article className="mx-auto max-w-3xl animate-pulse space-y-4">
      <div className="bg-muted h-4 w-40 rounded" />
      <div className="bg-muted h-10 w-3/4 rounded" />
      <div className="bg-muted h-5 w-full rounded" />
      <div className="bg-muted mt-8 aspect-[16/9] w-full rounded" />
    </article>
  );
}

async function BlogPostBody({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug, { publishedOnly: true });
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-mute mb-4 text-xs sm:text-sm">
        <Link
          href="/blog"
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          Blog
        </Link>
        <span className="mx-2">/</span>
        <span className="tabular-nums">
          {post.publishedAt
            ? formatDateTimeShort(post.publishedAt)
            : formatDateTimeShort(post.createdAt)}
        </span>
      </p>
      <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.1]">
        {post.title}
      </h1>
      {post.excerpt ? (
        <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
          {post.excerpt}
        </p>
      ) : null}
      {post.coverImageUrl ? (
        <div className="border-border relative mt-8 aspect-[16/9] overflow-hidden border">
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="border-border prose-invert mt-10 border-t pt-8 text-sm leading-relaxed sm:text-[15px]">
        <RichTextContent
          html={post.content}
          className="text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground space-y-4 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ps-5"
        />
      </div>
    </article>
  );
}

export default function BlogPostPage({ params }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pb-24 md:pt-32">
      <Suspense fallback={<BlogPostBodyFallback />}>
        <BlogPostBody params={params} />
      </Suspense>
    </main>
  );
}
