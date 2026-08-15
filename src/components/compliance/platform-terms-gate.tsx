"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchUserPreferences,
  patchUserPreferences,
} from "@/components/layout/preference-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import {
  asTermsVersion,
  hasAcceptedPlatformTerms,
  PLATFORM_TERMS_VERSION,
  platformTermsStorageKey,
  toAcceptedAtIso,
} from "@/lib/user/preferences";

const STORAGE_KEY = platformTermsStorageKey();
const STORAGE_VALUE = String(PLATFORM_TERMS_VERSION);

/**
 * First-session gate: privacy/terms acknowledgment before using the app.
 * Source of truth is the Users document. localStorage is a per-device cache
 * keyed by notice version so a v2 notice cannot be auto-accepted from v1.
 */
export function PlatformTermsGate() {
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sessionUser = session?.user as
    | {
        id?: string;
        platformTermsVersion?: number | string | null;
        platformTermsAcceptedAt?: Date | string | null;
      }
    | undefined;
  const userId = sessionUser?.id;
  const sessionTermsVersion = asTermsVersion(sessionUser?.platformTermsVersion);
  const sessionTermsAt = toAcceptedAtIso(sessionUser?.platformTermsAcceptedAt);

  useEffect(() => {
    if (isPending || !userId) {
      setOpen(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (hasAcceptedPlatformTerms(sessionTermsVersion, sessionTermsAt)) {
        try {
          localStorage.setItem(STORAGE_KEY, STORAGE_VALUE);
        } catch {
          /* ignore */
        }
        if (!cancelled) setOpen(false);
        return;
      }

      try {
        const prefs = await fetchUserPreferences();
        if (cancelled) return;
        if (prefs.platformTermsAccepted) {
          try {
            localStorage.setItem(STORAGE_KEY, STORAGE_VALUE);
          } catch {
            /* ignore */
          }
          setOpen(false);
          return;
        }
      } catch {
        /* fall through */
      }
      if (cancelled) return;

      try {
        if (
          localStorage.getItem(STORAGE_KEY) === STORAGE_VALUE ||
          localStorage.getItem("blucollarz_platform_terms_v1") === "1"
        ) {
          await patchUserPreferences({ platformTermsAccepted: true });
          if (!cancelled) setOpen(false);
          return;
        }
      } catch {
        /* still need an on-screen accept */
      }
      if (!cancelled) setOpen(true);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isPending, userId, sessionTermsVersion, sessionTermsAt]);

  if (!open) return null;

  return (
    <div className="bg-background/80 fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-terms-title"
        className="border-border bg-canvas max-h-[90vh] w-full max-w-md overflow-y-auto border p-5 shadow-sm"
      >
        <h2
          id="platform-terms-title"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          Privacy &amp; terms
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Blucollarz Technologies Private Limited is the Data Fiduciary for
          personal data we process on this platform. Please read our{" "}
          <Link
            href="/privacy"
            className="text-foreground underline underline-offset-2"
            target="_blank"
          >
            Privacy Notice
          </Link>
          ,{" "}
          <Link
            href="/terms"
            className="text-foreground underline underline-offset-2"
            target="_blank"
          >
            Terms
          </Link>
          , and{" "}
          <Link
            href="/grievance"
            className="text-foreground underline underline-offset-2"
            target="_blank"
          >
            Grievance
          </Link>{" "}
          contacts before continuing. DigiLocker verification asks for separate
          purpose consent later.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="border-input mt-0.5 size-4 accent-primary"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            I have read and agree to the Privacy Notice and Terms for using
            Blucollarz.
          </span>
        </label>
        {error ? (
          <p className="text-destructive mt-2 text-sm">{error}</p>
        ) : null}
        <Button
          className="mt-4 w-full"
          disabled={!accepted || saving}
          onClick={() => {
            void (async () => {
              setSaving(true);
              setError("");
              try {
                await patchUserPreferences({ platformTermsAccepted: true });
                try {
                  localStorage.setItem(STORAGE_KEY, STORAGE_VALUE);
                } catch {
                  /* ignore */
                }
                await authClient.getSession();
                setOpen(false);
              } catch {
                setError(
                  "Could not save. Check your connection and try again.",
                );
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
