"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "blucollarz_platform_terms_v1";

/**
 * First-session gate: privacy/terms acknowledgment before using the app.
 * Separate from DigiLocker purpose consent (Artifact 2).
 */
export function PlatformTermsGate() {
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (isPending || !session?.user) {
      setOpen(false);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setOpen(raw !== "1");
    } catch {
      setOpen(true);
    }
  }, [isPending, session?.user]);

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
        <Button
          className="mt-4 w-full"
          disabled={!accepted}
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setOpen(false);
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
