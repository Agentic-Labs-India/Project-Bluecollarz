/**
 * Spoken + on-screen notice — keep short for TTS.
 * Client and server must use the same strings so a grant can only follow a
 * playback of this wording, not a client-supplied script.
 *
 * DPDP s.6(1): KYC copy must not mention medical. That purpose is granted
 * later, when a test is actually booked.
 */
export const CONSENT_NOTICE_VERSION = "1.2";

export const CONSENT_PLAYBACK_SCOPES = ["kyc", "medical", "manage"] as const;
export type ConsentPlaybackScope = (typeof CONSENT_PLAYBACK_SCOPES)[number];

export const KYC_NOTICE =
  "We verify you through DigiLocker. Employers see results, not your documents. Interview scores may be shared for that job. A licensed recruiter places you. You pay nothing. You can view, fix, delete, or withdraw anytime. We never sell your data. You choose which of these you agree to.";

export const MEDICAL_NOTICE =
  "A fitness test is part of this role. We book it only after an employer selects you, and we store the report. You can withdraw this later in Settings. We never sell your data.";

export const MANAGE_NOTICE =
  "We verify you through DigiLocker. Employers see results, not your documents. Interview scores may be shared for that job. If an employer selects you, we book a medical fitness test and store its report. A licensed recruiter places you. You pay nothing. You can view, fix, delete, or withdraw anytime. We never sell your data. You choose which of these you agree to.";

export function isConsentPlaybackScope(
  value: string,
): value is ConsentPlaybackScope {
  return (CONSENT_PLAYBACK_SCOPES as readonly string[]).includes(value);
}

export function noticeTextForScope(scope: ConsentPlaybackScope): string {
  if (scope === "kyc") return KYC_NOTICE;
  if (scope === "medical") return MEDICAL_NOTICE;
  return MANAGE_NOTICE;
}
