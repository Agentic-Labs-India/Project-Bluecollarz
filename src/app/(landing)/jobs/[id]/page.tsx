import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoginButton } from "@/components/auth/login-button";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { formatJobPlaceLabel } from "@/lib/geo/places";
import { JOB_LOCATION_LABELS, type JobLocation } from "@/lib/jobs";
import { getPublishedJobPublic } from "@/lib/jobs/queries";
import { htmlToPlainText } from "@/lib/rich-text";

type PageProps = {
  params: Promise<{ id: string }>;
};

function seoDescriptionFromOverview(overview: string): string {
  const plain = htmlToPlainText(overview).replace(/\s+/g, " ").trim();
  if (!plain) return "Open role on Blucollarz. Log in to apply and interview.";
  if (plain.length <= 160) return plain;
  return `${plain.slice(0, 157).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getPublishedJobPublic(id);
  if (!job) {
    return { title: "Role · Blucollarz" };
  }
  const title = `${job.title} · Blucollarz`;
  const description = seoDescriptionFromOverview(job.overview);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function PublicJobBodyFallback() {
  return (
    <article className="mx-auto max-w-3xl animate-pulse space-y-4">
      <div className="bg-muted h-4 w-32 rounded" />
      <div className="bg-muted h-10 w-2/3 rounded" />
      <div className="bg-muted h-5 w-40 rounded" />
      <div className="bg-muted mt-8 h-24 w-full rounded" />
    </article>
  );
}

async function PublicJobBody({ params }: PageProps) {
  const { id } = await params;
  const job = await getPublishedJobPublic(id);
  if (!job) notFound();

  const placeLabel = formatJobPlaceLabel({
    location: job.location,
    countryCode: job.countryCode,
    stateCode: job.stateCode,
    locationLabel: job.location
      ? JOB_LOCATION_LABELS[job.location as JobLocation]
      : undefined,
  });

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-mute mb-4 text-xs sm:text-sm">
        <Link
          href="/"
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          Home
        </Link>
        <span className="mx-2">/</span>
        <span>Open role</span>
      </p>
      <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.1]">
        {job.title}
      </h1>
      <p className="text-muted-foreground mt-3 text-base sm:text-lg">
        {job.pay}
        {placeLabel ? (
          <span className="text-mute"> · {placeLabel}</span>
        ) : null}
      </p>

      <div className="border-border mt-8 flex flex-col gap-3 border-y py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          Sign in to apply, complete AI interviews, and track your application
          on Blucollarz.
        </p>
        <LoginButton className="bg-primary text-primary-foreground hover:bg-primary-active inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors">
          Log in
        </LoginButton>
      </div>

      <div className="mt-10 space-y-3">
        <h2 className="font-heading text-foreground text-lg font-semibold tracking-tight sm:text-xl">
          Overview
        </h2>
        <RichTextContent
          html={job.overview}
          className="text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground space-y-4 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ps-5"
        />
      </div>
    </article>
  );
}

export default function PublicJobPage({ params }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pb-24 md:pt-32">
      <Suspense fallback={<PublicJobBodyFallback />}>
        <PublicJobBody params={params} />
      </Suspense>
    </main>
  );
}
