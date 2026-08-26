"use client";

import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { stampPlatformTermsFromSiteAgreement } from "@/components/compliance/platform-terms-gate";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth/auth-client";
import {
  applyGtagConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/compliance/analytics";
import {
  hasAgreedToSite,
  SITE_AGREEMENT_SHOW_EVENT,
  writeSiteAgreement,
} from "@/lib/compliance/site-agreement";
import { cn } from "@/lib/utils";

function LegalLinks({ cookieAnchor }: { cookieAnchor?: boolean }) {
  return (
    <>
      {cookieAnchor ? (
        <>
          <a
            href="/privacy#cookies"
            className="text-foreground underline underline-offset-4"
          >
            Cookie Policy
          </a>
          ,{" "}
        </>
      ) : null}
      <a
        href="/privacy"
        className="text-foreground underline underline-offset-4"
      >
        Privacy Notice
      </a>
      {cookieAnchor ? ", and " : " and "}
      <a href="/terms" className="text-foreground underline underline-offset-4">
        Terms of Service
      </a>
    </>
  );
}

/**
 * 18+ age gate + cookie notice. Overlay = web bottom bar. Inline = native /auth.
 * Agree and continue unlocks DigiLocker (candidates) or Google Corporate Login
 * (recruiters/admins). Analytics stay
 * off unless turned on in Cookie settings.
 */
export function SiteAgreementPanel({
  variant,
  onDismiss,
}: {
  variant: "overlay" | "inline";
  onDismiss?: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { data: session } = authClient.useSession();
  const inline = variant === "inline";

  useEffect(() => {
    setAnalyticsOn(readAnalyticsConsent() === "granted");
    setAgreed(hasAgreedToSite());
  }, []);

  useEffect(() => {
    if (!inline) return;
    const show = () => {
      setSettingsOpen(false);
      document
        .getElementById("native-site-notice-title")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener(SITE_AGREEMENT_SHOW_EVENT, show);
    return () => window.removeEventListener(SITE_AGREEMENT_SHOW_EVENT, show);
  }, [inline]);

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

  const accept = async (withAnalytics?: boolean) => {
    writeSiteAgreement("agreed");
    if (withAnalytics !== undefined) {
      await persistAnalytics(withAnalytics);
    }
    if (session?.user) {
      try {
        await stampPlatformTermsFromSiteAgreement();
      } catch {
        /* banner already recorded; account stamp retries on next load */
      }
    }
    setAgreed(true);
    setSettingsOpen(false);
    onDismiss?.();
  };

  const rejectAll = async () => {
    writeSiteAgreement("declined");
    await persistAnalytics(false);
    setAgreed(false);
    setSettingsOpen(false);
    onDismiss?.();
    if (session?.user) {
      await authClient.signOut();
    }
    toast.message("Please agree to continue.");
  };

  const noticeId = inline ? "native-site-notice-title" : "site-notice-title";
  const frameClass = cn(
    "border-border bg-card text-foreground relative w-full overflow-hidden rounded-none border shadow-sm ring-1 ring-foreground/10",
    inline && "text-left",
  );

  const body = (
    <>
      {variant === "overlay" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          className="absolute top-2 right-2"
          onClick={() => {
            setSettingsOpen(false);
            onDismiss?.();
          }}
        >
          <XIcon />
        </Button>
      ) : null}

      {settingsOpen ? (
        <div
          className={cn("px-5 py-4 md:px-6", variant === "overlay" && "pr-12")}
        >
          <p
            id={noticeId}
            className="font-heading text-foreground text-sm font-semibold tracking-tight"
          >
            Cookie settings
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            You must be 18 or older to use Blucollarz. Essential cookies stay
            on. Optional analytics are off until you allow them. We do not use
            advertising cookies. Accepting here agrees to our <LegalLinks />.
          </p>
          <div className="mt-4 space-y-2">
            <div className="border-border bg-muted/40 flex items-center justify-between gap-4 rounded-none border px-4 py-3">
              <div>
                <p className="text-foreground text-sm font-medium">Essential</p>
                <p className="text-muted-foreground text-xs">
                  Sign-in and security. Always on.
                </p>
              </div>
              <Switch checked disabled size="sm" />
            </div>
            <div className="border-border bg-muted/40 flex items-center justify-between gap-4 rounded-none border px-4 py-3">
              <div>
                <p className="text-foreground text-sm font-medium">Analytics</p>
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
            id={noticeId}
            className={cn(
              "text-muted-foreground text-sm leading-relaxed",
              variant === "overlay" && "pr-8",
            )}
          >
            You must be 18 or older. Essential cookies keep the site working and
            stay on. Optional analytics stay off unless you turn them on in
            Cookie settings. We do not use advertising cookies. By clicking
            Agree and continue, you confirm you are 18 or older and agree to our{" "}
            <LegalLinks cookieAnchor />.
          </p>
          {inline && agreed ? (
            <p className="text-foreground mt-4 text-sm font-medium">
              You confirmed you are 18 or older. Essential cookies stay on.
            </p>
          ) : (
            <div
              className={cn(
                "mt-4 flex flex-wrap items-center gap-2",
                inline ? "flex-col items-stretch" : "justify-between",
              )}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsOpen(true)}
              >
                Cookies Settings
              </Button>
              <div className={cn("flex flex-wrap gap-2", inline && "w-full")}>
                <Button
                  type="button"
                  variant="outline"
                  className={inline ? "flex-1" : undefined}
                  onClick={() => {
                    void rejectAll();
                  }}
                >
                  Reject All
                </Button>
                <Button
                  type="button"
                  className={inline ? "flex-1" : undefined}
                  onClick={() => {
                    void accept();
                  }}
                >
                  Agree and continue
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <section aria-labelledby={noticeId} className={frameClass}>
        {body}
      </section>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={noticeId}
      className={frameClass}
    >
      {body}
    </div>
  );
}
