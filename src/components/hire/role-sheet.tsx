"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  JobForm,
  type JobFormHandle,
  type JobFormValues,
  jobFormPayload,
} from "@/components/hire/job-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getOwnedJobEditorAction, updateJobAction } from "@/lib/jobs/actions";
import {
  DEFAULT_CURRENCY,
  DEFAULT_PAY_TYPE,
  JOB_STATUS_LABELS,
  type JobEditorForm,
  type JobListItem,
} from "@/lib/jobs";
import { placeholderKeys } from "@/lib/utils";

function toJobFormValues(form: JobEditorForm): JobFormValues {
  return {
    title: form.title,
    payAmount: form.payAmount != null ? String(form.payAmount) : "",
    payType: form.payType ?? DEFAULT_PAY_TYPE,
    payCurrency: form.payCurrency ?? DEFAULT_CURRENCY,
    tab: form.tab,
    overview: form.overview,
    location: form.location ?? "on-site",
    countryCode: form.countryCode,
    stateCode: form.stateCode,
    priority: form.priority,
    applicationStepTemplates: form.applicationStepTemplates,
    customQuestions: form.customQuestions,
    raRcNumber: form.raRcNumber,
  };
}

function RoleFormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        {placeholderKeys(4).map((key) => (
          <div key={key} className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function RoleSheet({
  jobId,
  open,
  onOpenChange,
  onChanged,
}: {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the role is updated or its status changes. */
  onChanged?: () => void;
}) {
  const formRef = useRef<JobFormHandle>(null);
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<JobListItem | null>(null);
  const [formValues, setFormValues] = useState<JobFormValues | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const busy = formBusy || actionLoading;

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError("");
    try {
      const result = await getOwnedJobEditorAction(jobId);
      if (!result.ok) throw new Error(result.error);
      setItem(result.item);
      setFormValues(toJobFormValues(result.form));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load role");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (open && jobId) {
      void load();
    } else if (!open) {
      setItem(null);
      setFormValues(null);
      setError("");
      setFormBusy(false);
    }
  }, [open, jobId, load]);

  async function updateJob(values: JobFormValues, publish: boolean) {
    if (!jobId) return;
    const result = await updateJobAction(
      jobId,
      jobFormPayload(values, publish),
    );
    if (!result.ok) throw new Error(result.error);
    setItem(result.item);
    setFormValues({
      ...values,
      customQuestions: values.customQuestions ?? [],
    });
    onChanged?.();
  }

  async function runAction(action: "close") {
    if (!jobId) return;
    setActionLoading(true);
    setError("");
    try {
      const result = await updateJobAction(jobId, { action });
      if (!result.ok) throw new Error(result.error);
      setItem(result.item);
      onChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  const status = item?.status;
  const canPublish =
    status === "draft" || status === "closed" || status === "underVerification";
  const canClose = status === "published";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full! gap-0 p-0 sm:max-w-2xl!">
        <SheetHeader className="shrink-0 border-b">
          <div className="mb-1 flex items-center gap-2">
            {item ? <Badge>{JOB_STATUS_LABELS[item.status]}</Badge> : null}
            {item?.publishedAt ? (
              <span className="text-muted-foreground text-xs">
                Live since {new Date(item.publishedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
          <SheetTitle className="text-base">Manage role</SheetTitle>
          <SheetDescription>
            {item?.title ??
              "Edit details, submit for review, or close this role."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {loading ? (
              <RoleFormSkeleton />
            ) : error && !formValues ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : formValues ? (
              <>
                {status === "underVerification" ? (
                  <div className="border-border bg-muted/40 text-foreground mb-6 border px-4 py-3 text-sm leading-relaxed">
                    Your job post is in review and will be live within 4 hours
                    after approval.
                  </div>
                ) : null}
                {error ? (
                  <div className="border-destructive/20 bg-destructive/10 text-destructive mb-6 border px-4 py-3 text-sm">
                    {error}
                  </div>
                ) : null}
                <JobForm
                  key={jobId ?? "role"}
                  ref={formRef}
                  initialValues={formValues}
                  submitLabel="Save draft"
                  hideActions
                  onBusyChange={setFormBusy}
                  onSubmit={updateJob}
                />
              </>
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t">
          <div className="grid w-full grid-cols-3 gap-2">
            <Button
              size="sm"
              className="w-full"
              disabled={busy || !formValues}
              onClick={() => void formRef.current?.submit(false)}
            >
              {formBusy ? "Saving…" : "Save draft"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={busy || !formValues || !canPublish}
              onClick={() => void formRef.current?.submit(true)}
            >
              {formBusy
                ? "Submitting…"
                : status === "underVerification"
                  ? "Resubmit"
                  : "Submit for review"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={busy || !canClose}
              onClick={() => void runAction("close")}
            >
              Mark as close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
