"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  FileUpIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  KYC_DOC_GROUP_LABELS,
  KYC_DOC_GROUPS,
  KYC_UPLOAD_LABELS,
  KYC_UPLOAD_SLOTS,
  type KycDocAnalysis,
  type KycDocGroup,
  type KycPublicState,
  type KycUploadSlot,
} from "@/lib/kyc";
import { cn } from "@/lib/utils";

type LocalDoc = {
  file: File | null;
  previewUrl: string | null;
  error: string;
};

const emptyDoc = (): LocalDoc => ({
  file: null,
  previewUrl: null,
  error: "",
});

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

const GROUP_SLOTS: Record<KycDocGroup, KycUploadSlot[]> = {
  aadhaar: ["aadhaarFront", "aadhaarBack"],
  pan: ["pan"],
  passport: ["passport"],
};

function isRejected(row?: KycDocAnalysis | null): boolean {
  if (!row) return false;
  return (
    !row.documentPresent ||
    !row.looksAuthentic ||
    row.likelyAiGeneratedOrTampered
  );
}

function UploadSlot({
  slot,
  doc,
  verifying,
  rejectReason,
  rejected,
  onPick,
}: {
  slot: KycUploadSlot;
  doc: LocalDoc;
  verifying: boolean;
  rejectReason?: string;
  rejected?: boolean;
  onPick: (slot: KycUploadSlot, file: File | null) => void;
}) {
  return (
    <div
      className={cn(
        "border-border flex min-w-0 flex-1 flex-col gap-2 border p-2",
        rejected && "border-destructive/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Label className="text-foreground text-xs font-medium">
          {KYC_UPLOAD_LABELS[slot]}
        </Label>
        {doc.file ? (
          <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-[11px]">
            <CheckCircle2Icon className="size-3" />
            Selected
          </span>
        ) : null}
      </div>

      {doc.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.previewUrl}
          alt={`${KYC_UPLOAD_LABELS[slot]} preview`}
          className="border-border h-24 w-full object-contain border bg-muted/30"
        />
      ) : (
        <div className="border-border text-muted-foreground flex h-24 items-center justify-center border border-dashed text-center text-[11px]">
          No preview
        </div>
      )}

      <label
        className={cn(
          "border-border hover:bg-muted/40 flex cursor-pointer flex-col items-center gap-1 border border-dashed px-2 py-2.5 text-center transition-colors",
          verifying && "pointer-events-none opacity-60",
        )}
      >
        <FileUpIcon className="text-muted-foreground size-3.5 shrink-0" />
        <span className="text-muted-foreground w-full truncate text-[11px]">
          {doc.file?.name || "Choose file"}
        </span>
        <input
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={verifying}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            onPick(slot, file);
            e.target.value = "";
          }}
        />
      </label>

      {doc.error ? (
        <p className="text-destructive text-[11px]">{doc.error}</p>
      ) : null}
      {rejectReason ? (
        <p className="text-destructive text-[11px] leading-relaxed">
          Rejected: {rejectReason}
        </p>
      ) : null}
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
  const [kyc, setKyc] = useState<KycPublicState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [docs, setDocs] = useState<Record<KycUploadSlot, LocalDoc>>({
    aadhaarFront: emptyDoc(),
    aadhaarBack: emptyDoc(),
    pan: emptyDoc(),
    passport: emptyDoc(),
  });
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const previewUrls = useRef<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/kyc");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load KYC status");
      setKyc(json.kyc as KycPublicState);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load KYC");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current = [];
    };
  }, [load]);

  function onPick(slot: KycUploadSlot, file: File | null) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setDocs((prev) => ({
        ...prev,
        [slot]: {
          ...prev[slot],
          error: "Use a JPG, PNG, WebP, or PDF file.",
        },
      }));
      return;
    }

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;
    if (previewUrl) previewUrls.current.push(previewUrl);

    setDocs((prev) => ({
      ...prev,
      [slot]: {
        file,
        previewUrl,
        error: "",
      },
    }));
    setVerifyError("");
  }

  const allSelected = KYC_UPLOAD_SLOTS.every((slot) => docs[slot].file);

  async function runVerify() {
    if (!allSelected) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const form = new FormData();
      for (const slot of KYC_UPLOAD_SLOTS) {
        const file = docs[slot].file;
        if (!file) throw new Error(`Missing ${KYC_UPLOAD_LABELS[slot]}`);
        form.append(slot, file);
      }

      const res = await fetch("/api/kyc/verify", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Verification failed");

      const next = json.kyc as KycPublicState;
      setKyc(next);

      if (!next.verified) {
        setVerifyError(
          next.analysis?.summary ||
            "Documents were rejected. Please upload again.",
        );
      } else {
        setDocs({
          aadhaarFront: emptyDoc(),
          aadhaarBack: emptyDoc(),
          pan: emptyDoc(),
          passport: emptyDoc(),
        });
      }
    } catch (e: unknown) {
      setVerifyError(
        e instanceof Error ? e.message : "Verification failed. Try again.",
      );
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl py-10">
        <p className="text-destructive text-sm">{loadError}</p>
        <Button className="mt-4" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  const verified = kyc?.verified === true;
  const failed = kyc?.status === "failed";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          KYC verification
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Upload Aadhaar front and back, plus PAN and Passport.
          {jobTitle ? (
            <>
              {" "}
              Required for{" "}
              <span className="text-foreground font-medium">{jobTitle}</span>.
            </>
          ) : null}
        </p>
      </header>

      {verified ? (
        <div className="border-border bg-card mb-8 space-y-3 border p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2Icon className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-foreground font-medium">Identity verified</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {kyc?.analysis?.summary ||
                  "Your documents passed authenticity checks. The hiring team can proceed."}
              </p>
            </div>
          </div>
          {jobId ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/candidate/explore">Return to opportunity</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {failed && kyc?.analysis ? (
        <div className="border-destructive/30 bg-destructive/5 mb-8 space-y-3 border p-5">
          <div className="flex items-start gap-3">
            <XCircleIcon className="text-destructive mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-medium">
                Please upload again — these documents were rejected
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {kyc.analysis.summary}
              </p>
              {kyc.analysis.concerns.length ? (
                <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm">
                  {kyc.analysis.concerns.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!verified ? (
        <>
          <div className="flex flex-row gap-3">
            {KYC_DOC_GROUPS.map((group) => {
              const slots = GROUP_SLOTS[group];
              const groupRejected = slots.some((slot) =>
                isRejected(kyc?.analysis?.[slot]),
              );

              return (
                <div
                  key={group}
                  className={cn(
                    "border-border bg-card flex min-w-0 flex-1 flex-col gap-3 border p-3",
                    failed && groupRejected && "border-destructive/40",
                  )}
                >
                  <p className="text-foreground text-sm font-medium">
                    {KYC_DOC_GROUP_LABELS[group]}
                    {group === "aadhaar" ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        (front & back)
                      </span>
                    ) : null}
                  </p>

                  <div
                    className={cn(
                      "flex gap-2",
                      group === "aadhaar" ? "flex-row" : "flex-col",
                    )}
                  >
                    {slots.map((slot) => (
                      <UploadSlot
                        key={slot}
                        slot={slot}
                        doc={docs[slot]}
                        verifying={verifying}
                        rejected={failed && isRejected(kyc?.analysis?.[slot])}
                        rejectReason={
                          failed ? kyc?.analysis?.[slot]?.notes : undefined
                        }
                        onPick={onPick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-border/60 bg-muted/40 text-muted-foreground mt-6 flex gap-2 border px-3 py-2.5 text-xs leading-relaxed">
            <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Aadhaar needs both front and back. AI reviews all files before
              anything is stored. Fake or AI-generated IDs are rejected and never
              uploaded.
            </p>
          </div>

          {verifyError && !failed ? (
            <p className="text-destructive mt-4 text-sm">{verifyError}</p>
          ) : null}

          <Button
            className="mt-6 w-full"
            size="lg"
            disabled={!allSelected || verifying}
            onClick={() => void runVerify()}
          >
            {verifying ? <Spinner /> : null}
            {verifying ? "Checking with AI…" : "Check with AI & submit"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
