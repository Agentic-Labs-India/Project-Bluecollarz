"use client";

import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConsentNoticePanel } from "@/components/compliance/consent-notice-panel";
import { AppPage } from "@/components/layout/app-page";
import { KycPageSkeleton } from "@/components/layout/page-skeleton";
import { PrimaryDitherBand } from "@/components/landing/primary-dither";
import { Button } from "@/components/ui/button";
import type { DigilockerStatusResponse } from "@/lib/kyc/digilocker";

const OWRC_HELP_LINE = "1800 11 3090";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-0.5 text-sm wrap-break-word">{value}</p>
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
      <AppPage className="py-10">
        <p className="text-destructive text-sm">{loadError}</p>
        <Button className="mt-4" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </AppPage>
    );
  }

  const data = status?.data;
  const verified = status?.isKycVerified === true;
  const failed =
    status?.status === "failed" || searchParams.get("digilocker") === "error";

  return (
    <AppPage>
      {failed && status?.error ? (
        <div className="border-destructive/30 bg-destructive/5 mb-5 border p-5">
          <div className="flex items-start gap-3">
            <XCircleIcon className="text-destructive mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-foreground font-medium">Verification failed</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {status.error}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {verified ? (
        <div className="border-border bg-card overflow-hidden border">
          <PrimaryDitherBand seed="kyc-verified" />
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2Icon className="text-primary mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-foreground text-sm font-medium">
                  Identity verified
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  Name, date of birth, phone, location, gender, PAN, and Aadhaar
                  are saved from DigiLocker.
                  {status?.verifiedAt
                    ? ` · ${new Date(status.verifiedAt).toLocaleString()}`
                    : null}
                </p>
              </div>
            </div>

            {data ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" value={data.name} />
                <Field label="Date of birth" value={data.dateOfBirth} />
                <Field label="Gender" value={data.gender} />
                <Field
                  label="Aadhaar (last 4)"
                  value={
                    data.aadhaarLast4 ? `XXXXXXXX${data.aadhaarLast4}` : null
                  }
                />
                <Field label="PAN" value={data.pan} />
                <Field label="Email" value={data.email} />
                <Field label="Phone" value={data.phone} />
                <Field label="Address" value={data.address} />
                <Field label="Provider" value={data.provider} />
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/candidate/home">Continue</Link>
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
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {searchParams.get("consent") === "required" ? (
            <p className="border-border bg-muted/40 border p-3 text-sm">
              Turn on every switch, then Agree and Verify.
            </p>
          ) : null}
          <ConsentNoticePanel
            variant="kyc"
            verifyHref="/api/auth/digilocker/start"
          />
        </div>
      )}
    </AppPage>
  );
}
