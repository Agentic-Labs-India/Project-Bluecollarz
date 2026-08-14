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
    <div className="border-border bg-canvas fixed inset-x-0 bottom-0 z-90 border-t p-4 shadow-sm">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm leading-relaxed">
          We use essential cookies to keep you signed in. Optional analytics
          cookies (Google Analytics) help us improve the product — off until you
          allow them.{" "}
          <a href="/privacy" className="text-foreground underline">
            Privacy
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void choose(false);
            }}
          >
            Reject analytics
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void choose(true);
            }}
          >
            Allow analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
