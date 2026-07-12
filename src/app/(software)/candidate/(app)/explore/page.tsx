import { headers } from "next/headers";
import { ExploreOpportunities } from "@/components/work/explore-opportunities";
import { auth } from "@/lib/auth/auth";
import { normalizeProfileType } from "@/lib/profile-types";
import { getPublishedOpportunities } from "@/lib/jobs/queries";

export default async function ExplorePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id?: string; profileType?: string }
    | undefined;

  let initialOpportunities: Awaited<
    ReturnType<typeof getPublishedOpportunities>
  >["items"] = [];
  let initialAppliedIds: string[] = [];
  let initialProfileComplete = false;

  if (user?.id) {
    const result = await getPublishedOpportunities({
      viewerId: user.id,
      viewerProfileType: normalizeProfileType(user.profileType),
      page: 1,
      limit: 50,
    });
    initialOpportunities = result.items;
    initialAppliedIds = result.appliedJobIds;
    initialProfileComplete = result.profileComplete;
  }

  return (
    <ExploreOpportunities
      initialOpportunities={initialOpportunities}
      initialAppliedIds={initialAppliedIds}
      initialProfileComplete={initialProfileComplete}
    />
  );
}
