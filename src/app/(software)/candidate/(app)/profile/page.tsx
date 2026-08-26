import { Suspense } from "react";
import { CandidateProfileView } from "@/components/candidate/candidate-profile-view";
import { ProfilePageSkeleton } from "@/components/layout/page-skeleton";

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <CandidateProfileView />
    </Suspense>
  );
}
