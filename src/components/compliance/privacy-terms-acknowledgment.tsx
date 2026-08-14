"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConsentNoticePanel } from "@/components/compliance/consent-notice-panel";

type ConsentSnapshot = {
  active?: {
    purposes?: string[];
    grantedAt?: string | null;
    noticeVersion?: string | null;
  };
};

/**
 * Live consent status for settings — replaces the locked fake checkbox.
 * DigiLocker purpose panel is candidate-only.
 */
export function PrivacyTermsAcknowledgment({
  showConsentPanel = false,
}: {
  showConsentPanel?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<ConsentSnapshot | null>(null);
  const [loading, setLoading] = useState(showConsentPanel);

  useEffect(() => {
    if (!showConsentPanel) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/candidate/consent");
        if (!res.ok) return;
        const json = (await res.json()) as ConsentSnapshot;
        if (!cancelled) setSnapshot(json);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showConsentPanel]);

  const purposes = snapshot?.active?.purposes ?? [];
  const grantedAt = snapshot?.active?.grantedAt;

  return (
    <div className="space-y-4">
      <div className="border-border bg-muted/30 flex items-start gap-3 border p-3">
        <input
          type="checkbox"
          className="border-input mt-0.5 size-4 accent-primary"
          checked={showConsentPanel ? purposes.length > 0 : true}
          disabled
          readOnly
          aria-checked={showConsentPanel ? purposes.length > 0 : true}
          aria-label="Consent status"
        />
        <span className="space-y-1">
          <span className="text-foreground block text-sm font-medium">
            {showConsentPanel
              ? loading
                ? "Loading consent…"
                : purposes.length
                  ? "Verification consent on file"
                  : "No verification consent recorded yet"
              : "Platform privacy & terms"}
          </span>
          <span className="text-muted-foreground block text-xs">
            {showConsentPanel
              ? grantedAt
                ? `Recorded ${new Date(grantedAt).toLocaleString()}${
                    snapshot?.active?.noticeVersion
                      ? ` · notice v${snapshot.active.noticeVersion}`
                      : ""
                  } · ${purposes.join(", ")}`
                : "Grant purpose consent before DigiLocker KYC."
              : "See our public notices for how we process personal data."}{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Privacy
            </Link>
            {" · "}
            <Link
              href="/terms"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Terms
            </Link>
            {" · "}
            <Link
              href="/grievance"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Grievance
            </Link>
          </span>
        </span>
      </div>
      {showConsentPanel ? <ConsentNoticePanel compact /> : null}
    </div>
  );
}
