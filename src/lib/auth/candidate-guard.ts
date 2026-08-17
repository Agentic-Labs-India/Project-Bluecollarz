import "server-only";

import { type Guard, requireProfile } from "@/lib/auth/session";
import { getCandidateGateStatus } from "@/lib/candidate/queries";

/**
 * The candidate app shell redirects unverified users to onboarding then KYC.
 * Any API that creates or exposes a real-world commitment — applying,
 * interviewing, medical scheduling, fitness reports — must enforce the same
 * gate, because the shell only protects pages.
 */
export async function requireCandidateAppReady(): Promise<Guard> {
  const auth = await requireProfile("work");
  if (!auth.ok) return auth;

  const { complete, kycVerified } = await getCandidateGateStatus(auth.user.id);
  if (!complete) {
    return {
      ok: false,
      error: "Complete your profile before continuing.",
      status: 403,
      code: "PROFILE_INCOMPLETE",
    };
  }
  if (!kycVerified) {
    return {
      ok: false,
      error: "Verify your identity with DigiLocker before continuing.",
      status: 403,
      code: "KYC_REQUIRED",
    };
  }

  return auth;
}
