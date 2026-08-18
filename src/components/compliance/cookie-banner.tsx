"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import {
  ADULT_GATE_SHOW_EVENT,
  readAdultAttestation,
  writeAdultAttestation,
} from "@/lib/compliance/age-gate";
import { syncAnalyticsConsentWithAccount } from "@/lib/compliance/analytics";

/**
 * First-paint gate: 18+ self-attestation is required to Log in / Get Started.
 * Essential cookies are necessary; optional analytics stay off until Settings.
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

      const attestation = readAdultAttestation();
      if (attestation === "declined" && session?.user) {
        await authClient.signOut();
      }
      setVisible(attestation === null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener(ADULT_GATE_SHOW_EVENT, show);
    return () => window.removeEventListener(ADULT_GATE_SHOW_EVENT, show);
  }, []);

  const agree = () => {
    writeAdultAttestation("agreed");
    setVisible(false);
  };

  const decline = async () => {
    writeAdultAttestation("declined");
    setVisible(false);
    if (session?.user) {
      await authClient.signOut();
    }
    toast.message("You must be 18 or older to use Blucollarz.");
  };

  if (!visible) return null;

  return (
    <div className="border-border bg-background text-foreground fixed inset-x-0 bottom-0 z-90 flex items-start gap-3 border-t p-3 shadow-sm md:inset-x-auto md:right-6 md:bottom-6 md:w-80 md:flex-col md:border md:p-4 md:shadow-lg">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-foreground text-sm leading-snug font-medium md:text-[15px]">
          I confirm I am 18 or older
        </p>
        <p className="text-muted-foreground text-xs leading-snug md:leading-relaxed">
          Essential cookies keep you signed in. Optional analytics stay off.{" "}
          <a href="/privacy" className="text-foreground underline">
            Privacy
          </a>
        </p>
      </div>
      <div className="flex w-24 shrink-0 flex-col gap-1.5 md:w-full md:gap-2">
        <Button size="sm" className="w-full" onClick={agree}>
          Agree
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
