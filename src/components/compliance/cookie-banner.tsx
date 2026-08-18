"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { syncAnalyticsConsentWithAccount } from "@/lib/compliance/analytics";
import {
  readSiteAgreement,
  SITE_AGREEMENT_SHOW_EVENT,
  writeSiteAgreement,
} from "@/lib/compliance/site-agreement";

/**
 * First-paint notice, same shape as other products: one I agree covering
 * Terms, Privacy, and 18+. Cookies noted below. Purpose consents stay at KYC.
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
      setVisible(agreement === null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener(SITE_AGREEMENT_SHOW_EVENT, show);
    return () => window.removeEventListener(SITE_AGREEMENT_SHOW_EVENT, show);
  }, []);

  const agree = () => {
    writeSiteAgreement("agreed");
    setVisible(false);
  };

  const decline = async () => {
    writeSiteAgreement("declined");
    setVisible(false);
    if (session?.user) {
      await authClient.signOut();
    }
    toast.message("Please agree to continue.");
  };

  if (!visible) return null;

  return (
    <div className="border-border bg-background text-foreground fixed inset-x-0 bottom-0 z-90 flex items-start gap-3 border-t p-3 shadow-sm md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:flex-col md:border md:p-4 md:shadow-lg">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-foreground text-sm leading-snug md:text-[15px]">
          By clicking I agree, you agree to our{" "}
          <a href="/terms" className="underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline">
            Privacy Notice
          </a>
          , and confirm you are 18 or older.
        </p>
        <p className="text-muted-foreground text-xs leading-snug md:leading-relaxed">
          We use essential cookies to keep you signed in. Optional analytics
          stay off until Settings.
        </p>
      </div>
      <div className="flex w-24 shrink-0 flex-col gap-1.5 md:w-full md:gap-2">
        <Button size="sm" className="w-full" onClick={agree}>
          I agree
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            void decline();
          }}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
