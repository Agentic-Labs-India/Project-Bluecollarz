import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CandidateShell } from "@/app/(software)/candidate/candidate-shell";
import { auth } from "@/lib/auth/auth";
import {
  getProfileHomePath,
  normalizeProfileType,
} from "@/lib/profile-types";

/**
 * Candidate area: only `work` profiles. Hire profiles are sent to their home.
 * Onboarding gate lives in `(app)/layout.tsx` so `/candidate/onboarding`
 * stays reachable while the rest of the app is locked.
 */
export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <CandidateAuthGate>{children}</CandidateAuthGate>
    </Suspense>
  );
}

async function CandidateAuthGate({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id?: string; profileType?: string }
    | undefined;

  if (!user?.id) redirect("/");

  const profileType = normalizeProfileType(user.profileType);
  if (profileType !== "work") {
    redirect(getProfileHomePath(profileType));
  }

  return <CandidateShell>{children}</CandidateShell>;
}
