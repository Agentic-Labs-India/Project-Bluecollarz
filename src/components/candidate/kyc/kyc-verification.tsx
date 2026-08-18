"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConsentNoticePanel } from "@/components/compliance/consent-notice-panel";
import { PrimaryDitherBand } from "@/components/landing/primary-dither";
import { AppPage } from "@/components/layout/app-page";
import { KycPageSkeleton } from "@/components/layout/page-skeleton";
import { Button } from "@/components/ui/button";
import { formatDateOnlyDisplay } from "@/lib/core/dates";
import type {
  DigilockerKycView,
  DigilockerStatusResponse,
} from "@/lib/kyc/digilocker";

const OWRC_HELP_LINE = "1800 11 3090";

const FOOTER_LINK =
  "text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground";

function ClauseLabel({ n, children }: { n: string; children: string }) {
  return (
    <p className="text-primary text-[11px] font-semibold tracking-[0.16em] uppercase">
      {n} — {children}
    </p>
  );
}

function LegalFooterLinks() {
  return (
    <p className="text-muted-foreground text-xs leading-relaxed">
      Full wording:{" "}
      <Link href="/privacy" target="_blank" rel="noreferrer" className={FOOTER_LINK}>
        Privacy Notice
      </Link>
      {" · "}
      <Link href="/terms" target="_blank" rel="noreferrer" className={FOOTER_LINK}>
        Terms
      </Link>
      {" · "}
      <Link
        href="/grievance"
        target="_blank"
        rel="noreferrer"
        className={FOOTER_LINK}
      >
        Grievance
      </Link>
    </p>
  );
}

function formatGender(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (key === "m" || key === "male") return "Male";
  if (key === "f" || key === "female") return "Female";
  if (key === "o" || key === "other") return "Other";
  return value;
}

function formatProvider(value: string | null | undefined): string {
  if (!value) return "DigiLocker";
  if (value.trim().toLowerCase() === "digilocker") return "DigiLocker";
  return value;
}

function particulars(data: DigilockerKycView): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value?: string | null) => {
    if (value) rows.push({ label, value });
  };
  push("Name", data.name);
  push("Date of birth", formatDateOnlyDisplay(data.dateOfBirth) || data.dateOfBirth);
  push("Gender", formatGender(data.gender));
  push(
    "Aadhaar (last 4)",
    data.aadhaarLast4 ? `XXXXXXXX${data.aadhaarLast4}` : null,
  );
  push("PAN", data.pan);
  push("Email", data.email);
  push("Phone", data.phone);
  push("Address", data.address);
  return rows;
}

const DIGILOCKER_START = "/api/auth/digilocker/start";

function isDeclinedMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return /denied|declin/i.test(message);
}

function KycActions({
  primaryHref,
  primaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
}) {
  const api = primaryHref.startsWith("/api/");
  return (
    <div className="border-border space-y-4 border-t pt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Button size="lg" className="w-full sm:w-auto" asChild>
          {api ? (
            <a href={primaryHref}>{primaryLabel}</a>
          ) : (
            <Link href={primaryHref}>{primaryLabel}</Link>
          )}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full sm:w-auto"
          asChild
        >
          <a href={`tel:${OWRC_HELP_LINE.replace(/\s/g, "")}`}>
            Ask me a question → OWRC {OWRC_HELP_LINE}
          </a>
        </Button>
      </div>
      <LegalFooterLinks />
    </div>
  );
}

export function KycVerification() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<DigilockerStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const message = searchParams.get("message");
      const qs = message ? `?message=${encodeURIComponent(message)}` : "";
      const res = await fetch(`/api/auth/digilocker/status${qs}`);
      const json = (await res
        .json()
        .catch(() => ({}))) as DigilockerStatusResponse & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load KYC status");
      setStatus(json);
    } catch (e: unknown) {
      setLoadError(
        e instanceof Error ? e.message : "Failed to load KYC status",
      );
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <KycPageSkeleton />;

  if (loadError) {
    return (
      <AppPage>
        <article className="border-border bg-card overflow-hidden border">
          <PrimaryDitherBand seed="kyc-load-error" label="Not verified" />
          <div className="space-y-8 p-6 sm:p-8">
            <header className="space-y-2">
              <p className="text-mute text-xs font-medium tracking-[0.16em] uppercase">
                Identity record
              </p>
              <h2 className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                Identity not verified
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Blucollarz Technologies Private Limited · DigiLocker
              </p>
            </header>
            <section className="space-y-3">
              <ClauseLabel n="01">What happened</ClauseLabel>
              <p className="text-foreground text-sm leading-relaxed">
                {loadError}
              </p>
            </section>
            <div className="border-border space-y-4 border-t pt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => void load()}
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                  asChild
                >
                  <a href={`tel:${OWRC_HELP_LINE.replace(/\s/g, "")}`}>
                    Ask me a question → OWRC {OWRC_HELP_LINE}
                  </a>
                </Button>
              </div>
              <LegalFooterLinks />
            </div>
          </div>
        </article>
      </AppPage>
    );
  }

  const data = status?.data;
  const verified = status?.isKycVerified === true;
  const failMessage =
    status?.error || searchParams.get("message")?.trim() || "";
  const failed =
    !verified &&
    (status?.status === "failed" ||
      searchParams.get("digilocker") === "error" ||
      Boolean(failMessage));
  const declined = isDeclinedMessage(failMessage);
  const consentRequired = searchParams.get("consent") === "required";

  return (
    <AppPage>
      {verified ? (
        <article
          className="border-border bg-card overflow-hidden border"
          aria-labelledby="kyc-verified-title"
        >
          <PrimaryDitherBand seed="kyc-verified" label="Verified" />
          <div className="space-y-8 p-6 sm:p-8">
            <header className="space-y-2">
              <p className="text-mute text-xs font-medium tracking-[0.16em] uppercase">
                Identity record
              </p>
              <h2
                id="kyc-verified-title"
                className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Identity verified
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Blucollarz Technologies Private Limited · recorded from{" "}
                {formatProvider(data?.provider)}
                {status?.verifiedAt
                  ? ` · ${new Date(status.verifiedAt).toLocaleString()}`
                  : null}
              </p>
            </header>

            {data ? (
              <section className="space-y-3">
                <ClauseLabel n="01">Particulars</ClauseLabel>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Name, date of birth, phone, location, gender, PAN, and Aadhaar
                  are saved from DigiLocker. Employers see results, not these
                  documents.
                </p>
                <dl className="border-border divide-border divide-y border-y">
                  {particulars(data).map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-6"
                    >
                      <dt className="text-mute text-[11px] font-medium tracking-[0.12em] uppercase">
                        {row.label}
                      </dt>
                      <dd className="font-serif text-foreground text-[1.05rem] leading-snug wrap-break-word">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <section className="space-y-3">
              <ClauseLabel n="02">Source</ClauseLabel>
              <p className="text-foreground text-sm leading-relaxed">
                This record was issued by {formatProvider(data?.provider)}. It
                is held by Blucollarz as Data Fiduciary. You can view, fix,
                delete, or withdraw in Settings.
              </p>
            </section>

            <KycActions primaryHref="/candidate/home" primaryLabel="Continue" />
          </div>
        </article>
      ) : failed && !consentRequired ? (
        <article
          className="border-border bg-card overflow-hidden border"
          aria-labelledby="kyc-unverified-title"
        >
          <PrimaryDitherBand
            seed="kyc-unverified"
            label={declined ? "Declined" : "Not verified"}
          />
          <div className="space-y-8 p-6 sm:p-8">
            <header className="space-y-2">
              <p className="text-mute text-xs font-medium tracking-[0.16em] uppercase">
                Identity record
              </p>
              <h2
                id="kyc-unverified-title"
                className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Identity not verified
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Blucollarz Technologies Private Limited · DigiLocker
              </p>
            </header>

            <section className="space-y-3">
              <ClauseLabel n="01">What happened</ClauseLabel>
              <p className="text-foreground text-sm leading-relaxed">
                {failMessage ||
                  (declined
                    ? "DigiLocker authorization was declined."
                    : "DigiLocker could not complete verification.")}
              </p>
            </section>

            <section className="space-y-3">
              <ClauseLabel n="02">Next step</ClauseLabel>
              <p className="text-foreground text-sm leading-relaxed">
                Reverify with DigiLocker. If purpose consent is missing, you
                will be asked to grant it first. Employers never see your
                documents.
              </p>
            </section>

            <KycActions
              primaryHref={DIGILOCKER_START}
              primaryLabel="Reverify"
            />
          </div>
        </article>
      ) : (
        <div className="space-y-5">
          {consentRequired ? (
            <p className="border-border bg-muted/40 text-muted-foreground border px-4 py-3 text-sm leading-relaxed">
              Turn on every purpose in the declaration, then Agree and Verify.
            </p>
          ) : null}
          <ConsentNoticePanel
            variant="kyc"
            verifyHref={DIGILOCKER_START}
          />
        </div>
      )}
    </AppPage>
  );
}
