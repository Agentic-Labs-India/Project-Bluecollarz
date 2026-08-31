import { CandidateProfileView } from "@/components/candidate/candidate-profile-view";
import { requirePageProfile } from "@/lib/auth/session";
import { getCandidateProfileByUserId } from "@/lib/candidate/queries";

export default async function ProfilePage() {
  const user = await requirePageProfile("work");
  const profile = await getCandidateProfileByUserId(user.id);
  if (!profile) {
    throw new Error("Candidate user record is missing");
  }

  return <CandidateProfileView initialProfile={profile} />;
}
