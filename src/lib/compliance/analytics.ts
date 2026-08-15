/** Client analytics consent helpers (anonymous + signed-in sync). */

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
 * Browser choice wins when the user already Allow/Reject'd.
 * If they have not chosen on this device, pull the signed-in account.
 */
export async function syncAnalyticsConsentWithAccount(): Promise<
  boolean | null
> {
  if (typeof window === "undefined") return null;
  const local = readAnalyticsConsent();
  try {
    const res = await fetch("/api/user/preferences");
    if (!res.ok) return null;
    const json = (await res.json()) as {
      preferences?: { cookiesEnabled?: boolean };
    };
    const serverGranted = json.preferences?.cookiesEnabled === true;

    if (local === "granted" || local === "denied") {
      const want = local === "granted";
      if (want !== serverGranted) {
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookiesEnabled: want }),
        });
      }
      applyGtagConsent(want);
      return want;
    }

    if (serverGranted) {
      writeAnalyticsConsent("granted");
      applyGtagConsent(true);
      return true;
    }
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
