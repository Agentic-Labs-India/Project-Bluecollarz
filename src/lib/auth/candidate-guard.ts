import "server-only";

import { type Guard, requireProfile } from "@/lib/auth/session";
import { getCandidateGateStatus } from "@/lib/candidate/queries";
import {
  hasGrantedPurposes,
  INTERVIEW_RELEASE_REQUIRED_PURPOSES,
} from "@/lib/compliance/consent";

/**
 * The candidate app shell redirects unverified users to KYC then onboarding.
 * Any API that creates or exposes a real-world commitment — applying,
 * interviewing, medical scheduling, fitness reports — must enforce the same
 * gate, because the shell only protects pages.
 */
export async function requireCandidateAppReady(): Promise<Guard> {
  const auth = await requireProfile("work");
  if (!auth.ok) return auth;

  const { complete, kycVerified } = await getCandidateGateStatus(auth.user.id);
  if (!kycVerified) {
    return {
      ok: false,
      error: "Verify your identity with DigiLocker before continuing.",
      status: 403,
      code: "KYC_REQUIRED",
    };
  }
  if (!complete) {
    return {
      ok: false,
      error: "Complete your profile before continuing.",
      status: 403,
      code: "PROFILE_INCOMPLETE",
    };
  }

  return auth;
}

/** Interviews process evaluation data — require that purpose, not KYC bundling. */
export async function requireInterviewEvaluationConsent(): Promise<Guard> {
  const auth = await requireCandidateAppReady();
  if (!auth.ok) return auth;

  const granted = await hasGrantedPurposes(
    auth.user.id,
    INTERVIEW_RELEASE_REQUIRED_PURPOSES,
  );
  if (!granted) {
    return {
      ok: false,
      error: "Agree to interview evaluation before continuing.",
      status: 403,
      code: "EVALUATION_CONSENT_REQUIRED",
    };
  }

  return auth;
}
