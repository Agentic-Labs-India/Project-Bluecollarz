/**
 * Spoken + on-screen notice — keep short for TTS.
 * Client and server must use the same string so a grant can only follow a
 * playback of this wording, not a client-supplied script.
 *
 * One sitting before DigiLocker covers every purpose this product uses.
 * Settings re-reads the same notice after a withdraw. Passport / PCC /
 * emigration clearance are not in this product.
 */
export const CONSENT_NOTICE_VERSION = "1.5";

export const CONSENT_PLAYBACK_SCOPES = ["kyc", "manage"] as const;
export type ConsentPlaybackScope = (typeof CONSENT_PLAYBACK_SCOPES)[number];

export const KYC_NOTICE =
  "We verify you through DigiLocker. Employers see results, not your documents. Interviews may be recorded for a role you pursue. AI interview scores assist a human employer; they do not hire you automatically. If an employer selects you, we book a fitness test and store the report. You pay nothing. You can view, fix, delete, or withdraw anytime. We never sell your data. You choose which of these you agree to.";

export function isConsentPlaybackScope(
  value: string,
): value is ConsentPlaybackScope {
  return (CONSENT_PLAYBACK_SCOPES as readonly string[]).includes(value);
}

export function noticeTextForScope(_scope: ConsentPlaybackScope): string {
  return KYC_NOTICE;
}
