"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { KycPageSkeleton } from "@/components/layout/page-skeleton";
import { Button } from "@/components/ui/button";
import type { DigilockerStatusResponse } from "@/lib/digilocker";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-0.5 text-sm wrap-break-word">{value}</p>
    </div>
  );
}

export function KycVerification({
  jobId,
  jobTitle,
}: {
  jobId?: string | null;
  jobTitle?: string | null;
}) {
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
      const json = (await res.json().catch(() => ({}))) as DigilockerStatusResponse & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load KYC status");
      setStatus(json);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load KYC status");
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
    status?.status === "failed" ||
    searchParams.get("digilocker") === "error";
  const startHref = jobId
    ? `/api/auth/digilocker/start?jobId=${jobId}`
    : "/api/auth/digilocker/start";

  return (
    <AppPage>
      <header className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          KYC verification
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Verify with DigiLocker. Matching identity fields update your profile
          and lock phone, DOB, address, PAN, Aadhaar, and gender.
          {jobTitle ? (
            <>
              {" "}
              Required for{" "}
              <span className="text-foreground font-medium">{jobTitle}</span>.
            </>
          ) : null}
        </p>
      </header>

      {failed && status?.error ? (
        <div className="border-destructive/30 bg-destructive/5 mb-8 border p-5">
          <div className="flex items-start gap-3">
            <XCircleIcon className="text-destructive mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-foreground font-medium">Verification failed</p>
              <p className="text-muted-foreground mt-1 text-sm">{status.error}</p>
            </div>
          </div>
        </div>
      ) : null}

      {verified ? (
        <div className="border-border bg-card mb-8 space-y-5 border p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
            <div>
              <p className="text-foreground font-medium">Identity verified</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Saved on your account from DigiLocker. Locked fields can no
                longer be edited.
                {status?.verifiedAt
                  ? ` · ${new Date(status.verifiedAt).toLocaleString()}`
                  : null}
              </p>
            </div>
          </div>

          {data ? (
            <div className="border-border/70 space-y-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" value={data.name} />
                <Field label="Date of birth" value={data.dateOfBirth} />
                <Field label="Gender" value={data.gender} />
                <Field
                  label="Aadhaar (last 4)"
                  value={
                    data.aadhaarLast4
                      ? `XXXXXXXX${data.aadhaarLast4}`
                      : null
                  }
                />
                <Field label="PAN" value={data.pan} />
                <Field label="APAAR ID" value={data.apaarId} />
                <Field label="Email" value={data.email} />
                <Field label="Phone" value={data.phone} />
                <Field label="Address" value={data.address} />
                <Field label="Provider" value={data.provider} />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/candidate/profile">View profile</Link>
            </Button>
            {jobId ? (
              <Button asChild variant="outline">
                <Link href={`/candidate/explore?jobId=${jobId}`}>
                  Return to opportunity
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="border-border bg-card space-y-5 border p-5">
          <div className="flex items-start gap-3">
            <ShieldCheckIcon className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-foreground font-medium">Verify with DigiLocker</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Consent on MeriPehchaan. We save verified identity fields to your
                account (name, DOB, gender, PAN, Aadhaar last 4, phone, address)
                — not raw DigiLocker XML.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href={startHref}>Verify with DigiLocker</a>
          </Button>
        </div>
      )}

      {jobId ? (
        <Button asChild variant="ghost" className="mt-4">
          <Link href={`/candidate/explore?jobId=${jobId}`}>
            <ArrowLeftIcon className="size-4" />
            Back to role
          </Link>
        </Button>
      ) : null}
    </AppPage>
  );
}
