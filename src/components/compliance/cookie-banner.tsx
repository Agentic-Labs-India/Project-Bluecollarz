"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  applyGtagConsent,
} from "@/lib/compliance/analytics";

/**
 * Analytics cookie banner — essential auth cookies always allowed.
 * Signed-in users also sync `users.cookiesEnabled` so rail prefs match.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    setVisible(readAnalyticsConsent() === null);
  }, []);

  const choose = async (granted: boolean) => {
    writeAnalyticsConsent(granted ? "granted" : "denied");
    applyGtagConsent(granted);
    setVisible(false);
    if (session?.user) {
      try {
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookiesEnabled: granted }),
        });
      } catch {
        /* local consent already applied */
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="border-border bg-background text-foreground fixed inset-x-0 bottom-0 z-90 flex items-start gap-3 border-t p-3 shadow-sm md:inset-x-auto md:right-6 md:bottom-6 md:w-80 md:flex-col md:border md:p-4 md:shadow-lg">
      <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-snug md:text-sm md:leading-relaxed">
        We use essential cookies to keep you signed in. Optional analytics
        cookies (Google Analytics) help us improve the product — off until you
        allow them.{" "}
        <a href="/privacy" className="text-foreground underline">
          Privacy
        </a>
      </p>
      <div className="flex w-24 shrink-0 flex-col gap-1.5 md:w-full md:gap-2">
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            void choose(true);
          }}
        >
          Allow
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            void choose(false);
          }}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
