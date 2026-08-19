"use client";

import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth/auth-client";
import {
  applyGtagConsent,
  readAnalyticsConsent,
  syncAnalyticsConsentWithAccount,
  writeAnalyticsConsent,
} from "@/lib/compliance/analytics";
import {
  readSiteAgreement,
  SITE_AGREEMENT_SHOW_EVENT,
  writeSiteAgreement,
} from "@/lib/compliance/site-agreement";

/**
 * First-paint bar: 18+ warning, essential cookies, optional analytics.
 * Accept All / Reject All / Cookies Settings. Reject All still blocks Log in.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);
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
      setAnalyticsOn(readAnalyticsConsent() === "granted");
      setVisible(agreement === null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  useEffect(() => {
    const show = () => {
      setSettingsOpen(false);
      setVisible(true);
    };
    window.addEventListener(SITE_AGREEMENT_SHOW_EVENT, show);
    return () => window.removeEventListener(SITE_AGREEMENT_SHOW_EVENT, show);
  }, []);

  const persistAnalytics = async (granted: boolean) => {
    writeAnalyticsConsent(granted ? "granted" : "denied");
    applyGtagConsent(granted);
    if (!session?.user) return;
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookiesEnabled: granted }),
      });
    } catch {
      /* local consent already applied */
    }
  };

  const accept = async (withAnalytics: boolean) => {
    writeSiteAgreement("agreed");
    await persistAnalytics(withAnalytics);
    setVisible(false);
    setSettingsOpen(false);
  };

  const rejectAll = async () => {
    writeSiteAgreement("declined");
    await persistAnalytics(false);
    setVisible(false);
    setSettingsOpen(false);
    if (session?.user) {
      await authClient.signOut();
    }
    toast.message("Please agree to continue.");
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex justify-center p-3 md:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-notice-title"
        className="border-border bg-card text-foreground pointer-events-auto relative w-full max-w-3xl overflow-hidden rounded-none border shadow-sm ring-1 ring-foreground/10"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          className="absolute top-2 right-2"
          onClick={() => {
            setVisible(false);
            setSettingsOpen(false);
          }}
        >
          <XIcon />
        </Button>

        {settingsOpen ? (
          <div className="px-5 py-4 pr-12 md:px-6">
            <p
              id="site-notice-title"
              className="font-heading text-foreground text-sm font-semibold tracking-tight"
            >
              Cookie settings
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              You must be 18 or older to use Blucollarz. Essential cookies stay
              on. Optional analytics are off until you allow them. We do not use
              advertising cookies. Accepting here agrees to our{" "}
              <a
                href="/privacy"
                className="text-foreground underline underline-offset-4"
              >
                Privacy Notice
              </a>{" "}
              and{" "}
              <a
                href="/terms"
                className="text-foreground underline underline-offset-4"
              >
                Terms of Service
              </a>
              .
            </p>
            <div className="mt-4 space-y-2">
              <div className="border-border bg-muted/40 flex items-center justify-between gap-4 rounded-none border px-4 py-3">
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Essential
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Sign-in and security. Always on.
                  </p>
                </div>
                <Switch checked disabled size="sm" />
              </div>
              <div className="border-border bg-muted/40 flex items-center justify-between gap-4 rounded-none border px-4 py-3">
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Analytics
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Google Analytics. Off unless you allow.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={analyticsOn}
                  onCheckedChange={setAnalyticsOn}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsOpen(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void accept(analyticsOn);
                }}
              >
                Accept
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 md:px-6">
            <p
              id="site-notice-title"
              className="text-muted-foreground pr-8 text-sm leading-relaxed"
            >
              You must be 18 or older. Essential cookies keep the site working
              and stay on. Optional analytics help with performance — accept,
              reject, or manage them. We do not use advertising cookies. By
              clicking Accept All Cookies, you confirm you are 18 or older and
              agree to our{" "}
              <a
                href="/privacy#cookies"
                className="text-foreground underline underline-offset-4"
              >
                Cookie Policy
              </a>
              ,{" "}
              <a
                href="/privacy"
                className="text-foreground underline underline-offset-4"
              >
                Privacy Notice
              </a>
              , and{" "}
              <a
                href="/terms"
                className="text-foreground underline underline-offset-4"
              >
                Terms of Service
              </a>
              .
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsOpen(true)}
              >
                Cookies Settings
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void rejectAll();
                  }}
                >
                  Reject All
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    void accept(true);
                  }}
                >
                  Accept All Cookies
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
