import { Suspense } from "react";
import { CandidateProfileView } from "@/components/candidate/candidate-profile-view";
import { ProfilePageSkeleton } from "@/components/layout/page-skeleton";
import { requirePageProfile } from "@/lib/auth/session";
import { getCandidateProfileByUserId } from "@/lib/candidate/queries";

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfileBody />
    </Suspense>
  );
}

async function ProfileBody() {
  const user = await requirePageProfile("work");
  const profile = await getCandidateProfileByUserId(user.id);
  if (!profile) {
    throw new Error("Candidate user record is missing");
  }

  return <CandidateProfileView initialProfile={profile} />;
}
