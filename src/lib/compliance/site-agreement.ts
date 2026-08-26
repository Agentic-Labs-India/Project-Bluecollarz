/**
 * Pre-login site agreement (Terms, Privacy, 18+, cookies).
 * Login is blocked until this is "agreed". After Google, the same click is
 * stamped onto the user (no second dialog). KYC purpose consents stay separate.
 */

export const SITE_AGREEMENT_KEY = "blucollarz_site_agreement";
export const SITE_AGREEMENT_SHOW_EVENT = "blucollarz:site-agreement-show";

export type SiteAgreement = "agreed" | "declined" | null;

export function readSiteAgreement(): SiteAgreement {
  try {
    const raw = localStorage.getItem(SITE_AGREEMENT_KEY);
    if (raw === "agreed" || raw === "declined") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeSiteAgreement(value: "agreed" | "declined") {
  try {
    localStorage.setItem(SITE_AGREEMENT_KEY, value);
  } catch {
    /* ignore */
  }
}

export function hasAgreedToSite(): boolean {
  return readSiteAgreement() === "agreed";
}

/** Re-open the banner (login blocked until they accept). */
export function requestSiteAgreement() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SITE_AGREEMENT_SHOW_EVENT));
}
