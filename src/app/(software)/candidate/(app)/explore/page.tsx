import { headers } from "next/headers";
import { ExploreOpportunities } from "@/components/work/explore-opportunities";
import { auth } from "@/lib/auth/auth";
import { isId } from "@/lib/db";
import { normalizeProfileType } from "@/lib/profile-types";
import { getPublishedOpportunities } from "@/lib/jobs/queries";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id?: string; profileType?: string }
    | undefined;
  const { jobId: rawJobId } = await searchParams;
  const initialJobId =
    typeof rawJobId === "string" && isId(rawJobId) ? rawJobId : null;

  let initialOpportunities: Awaited<
    ReturnType<typeof getPublishedOpportunities>
  >["items"] = [];
  let initialApplicationStatuses: Awaited<
    ReturnType<typeof getPublishedOpportunities>
  >["applicationStatuses"] = {};
  let initialProfileComplete = false;
  let initialKycVerified = false;

  if (user?.id) {
    const result = await getPublishedOpportunities({
      viewerId: user.id,
      viewerProfileType: normalizeProfileType(user.profileType),
      page: 1,
      limit: 50,
      pinJobId: initialJobId,
    });
    initialOpportunities = result.items;
    initialApplicationStatuses = result.applicationStatuses;
    initialProfileComplete = result.profileComplete;
    initialKycVerified = result.kycVerified;
  }

  return (
    <ExploreOpportunities
      initialOpportunities={initialOpportunities}
      initialApplicationStatuses={initialApplicationStatuses}
      initialProfileComplete={initialProfileComplete}
      initialKycVerified={initialKycVerified}
      initialJobId={initialJobId}
    />
  );
}
