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
  toAcceptedAtIso,
} from "@/lib/user/preferences";

/**
 * First-session gate: privacy/terms acknowledgment before using the app.
 * The Users document is the only source of truth. Acceptance is never inferred
 * from device state — a browser flag says nothing about which person is signed
 * in, and recording an agreement the user did not make is worse than asking twice.
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
        profileType?: string;
        platformTermsVersion?: number | string | null;
        platformTermsAcceptedAt?: Date | string | null;
      }
    | undefined;
  const userId = sessionUser?.id;
  const isCandidate = sessionUser?.profileType === "work";
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
        if (!cancelled) setOpen(false);
        return;
      }

      try {
        const prefs = await fetchUserPreferences();
        if (cancelled) return;
        if (prefs.platformTermsAccepted) {
          setOpen(false);
          return;
        }
      } catch {
        /* Unreadable state means unaccepted: ask again rather than assume. */
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
    <div className="bg-background/80 pointer-events-auto fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-terms-title"
        className="border-border bg-canvas pointer-events-auto relative z-100 max-h-[90vh] w-full max-w-md overflow-y-auto border p-5 shadow-sm"
      >
        <h2
          id="platform-terms-title"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          Privacy &amp; terms
        </h2>
        {isCandidate ? (
          <div className="text-muted-foreground mt-2 space-y-3 text-sm leading-relaxed">
            <p>
              This is a computer helper, not a person. I cannot give legal
              advice.
            </p>
            <p>
              What you say here is saved in your Blucollarz account so we can
              help you find work. You can ask us to show or delete your
              information.
            </p>
            <p>
              Please also read our{" "}
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
              page. DigiLocker will ask for extra permission later.
            </p>
          </div>
        ) : (
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
            contacts before continuing.
          </p>
        )}
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="border-input mt-0.5 size-4 shrink-0 accent-primary"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            {isCandidate
              ? "I have read this. I agree to the Privacy Notice and Terms."
              : "I have read and agree to the Privacy Notice and Terms for using Blucollarz."}
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
          {isCandidate ? "Okay, start" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
