import { getUserPreferencesAction, updateUserPreferencesAction } from "@/lib/user/actions";

export const ANALYTICS_CONSENT_KEY = "blucollarz_analytics_consent_v1";

export type AnalyticsConsent = "granted" | "denied" | null;

export function readAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (raw === "granted" || raw === "denied") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/** Only an explicit Allow counts. Unset and Reject both keep analytics off. */
export function isAnalyticsGranted(): boolean {
  return readAnalyticsConsent() === "granted";
}

export function writeAnalyticsConsent(value: "granted" | "denied") {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("blucollarz:analytics-consent", { detail: value }),
    );
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Local choice wins when the user already Allow/Reject'd.
 * Unset stays off until they opt in (DPDP s.6 affirmative consent).
 */
export async function syncAnalyticsConsentWithAccount(): Promise<
  boolean | null
> {
  if (typeof window === "undefined") return null;
  const local = readAnalyticsConsent();
  try {
    const loaded = await getUserPreferencesAction();
    if (!loaded.ok) return null;
    const serverGranted = loaded.preferences.cookiesEnabled === true;

    if (local === "granted" || local === "denied") {
      const want = local === "granted";
      if (want !== serverGranted) {
        await updateUserPreferencesAction({ cookiesEnabled: want });
      }
      applyGtagConsent(want);
      return want;
    }

    if (serverGranted) {
      writeAnalyticsConsent("granted");
      applyGtagConsent(true);
      return true;
    }
    applyGtagConsent(false);
    return false;
  } catch {
    return null;
  }
}

export function applyGtagConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  const gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  window.gtag = gtag;
  gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}
