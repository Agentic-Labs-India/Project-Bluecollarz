import { Suspense } from "react";
import { ExplorePageSkeleton } from "@/components/layout/page-skeleton";
import { ExploreOpportunities } from "@/components/work/explore-opportunities";
import { requirePageProfile } from "@/lib/auth/session";
import { isId } from "@/lib/db";
import { getPublishedOpportunities } from "@/lib/jobs/queries";

export default function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  return (
    <Suspense fallback={<ExplorePageSkeleton />}>
      <ExploreBody searchParams={searchParams} />
    </Suspense>
  );
}

async function ExploreBody({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const user = await requirePageProfile("work");
  const { jobId: rawJobId } = await searchParams;
  const initialJobId =
    typeof rawJobId === "string" && isId(rawJobId) ? rawJobId : null;

  const result = await getPublishedOpportunities({
    viewerId: user.id,
    viewerProfileType: user.profileType,
    page: 1,
    limit: 12,
    pinJobId: initialJobId,
  });

  return (
    <ExploreOpportunities
      initialOpportunities={result.items}
      initialApplicationStatuses={result.applicationStatuses}
      initialProfileComplete={result.profileComplete}
      initialPageCount={result.pageCount}
      initialJobId={initialJobId}
    />
  );
}
