"use client";

import { useEffect, useState } from "react";
import { SiteAgreementPanel } from "@/components/compliance/site-agreement-panel";
import { authClient } from "@/lib/auth/auth-client";
import { syncAnalyticsConsentWithAccount } from "@/lib/compliance/analytics";
import {
  readSiteAgreement,
  SITE_AGREEMENT_SHOW_EVENT,
} from "@/lib/compliance/site-agreement";

function onNativeAuthPath(): boolean {
  return window.location.pathname === "/auth";
}

/**
 * First-paint bar: 18+ warning, essential cookies, optional analytics.
 * Hidden on native /auth — that screen has the same notice inline.
 * Reject All still blocks Log in until Terms, Privacy, and 18+ are agreed.
 * Analytics stay off unless the person turns them on in Cookie settings.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (session?.user) {
        await syncAnalyticsConsentWithAccount();
      }
      if (cancelled) return;

      const agreement = readSiteAgreement();
      if (agreement === "declined" && session?.user) {
        await authClient.signOut();
      }
      setVisible(agreement === null && !onNativeAuthPath());
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  useEffect(() => {
    const show = () => {
      if (onNativeAuthPath()) return;
      setVisible(true);
    };
    window.addEventListener(SITE_AGREEMENT_SHOW_EVENT, show);
    return () => window.removeEventListener(SITE_AGREEMENT_SHOW_EVENT, show);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex justify-center p-3 md:p-4">
      <div className="pointer-events-auto w-full max-w-3xl">
        <SiteAgreementPanel
          variant="overlay"
          onDismiss={() => setVisible(false)}
        />
      </div>
    </div>
  );
}
