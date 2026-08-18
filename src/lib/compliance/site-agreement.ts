/** Pre-login “I agree” (Terms, Privacy, 18+). Account terms + KYC consents come later. */

export const SITE_AGREEMENT_KEY = "blucollarz_site_agreement_v1";
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

/** Re-open the banner (login blocked until they click I agree). */
export function requestSiteAgreement() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SITE_AGREEMENT_SHOW_EVENT));
}
