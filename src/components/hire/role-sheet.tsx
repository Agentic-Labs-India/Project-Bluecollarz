"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JobForm, type JobFormValues } from "@/components/hire/job-form";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobListItem } from "@/lib/jobs";
import { normalizeJobLocation } from "@/lib/jobs";

function RoleFormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <div className="flex gap-3 border-t pt-6">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
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
  /** Called after the role is updated, status-changed, or deleted. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<JobListItem | null>(null);
  const [formValues, setFormValues] = useState<JobFormValues | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Role not found");
      setItem(json.item);
      setFormValues(json.form);
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
    }
  }, [open, jobId, load]);

  async function updateJob(values: JobFormValues, publish: boolean) {
    if (!jobId) return;
    const steps = values.applicationStepTemplates
      ?.map((step) => ({ id: step.id, label: step.label.trim() }))
      .filter((step) => step.label.length > 0);

    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title.trim(),
        pay: values.pay.trim(),
        tab: values.tab,
        overview: values.overview.trim(),
        location: values.location
          ? normalizeJobLocation(values.location)
          : "remote",
        countryCode: values.countryCode || null,
        stateCode: values.stateCode || null,
        priority: values.priority,
        applicationStepTemplates: steps?.length ? steps : undefined,
        publish,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Failed to update role");
    setItem(json.item);
    onChanged?.();
  }

  async function runAction(action: "publish" | "close" | "reopen" | "delete") {
    if (!jobId) return;
    setActionLoading(true);
    setError("");
    try {
      if (action === "delete") {
        const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to delete role");
        }
        onOpenChange(false);
        onChanged?.();
        return;
      }

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Action failed");
      setItem(json.item);
      onChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full! gap-0 p-0 sm:max-w-2xl!"
      >
        <SheetHeader className="shrink-0 border-b">
          <div className="mb-1 flex items-center gap-2">
            {item ? <Badge>{item.status}</Badge> : null}
            {item?.publishedAt ? (
              <span className="text-muted-foreground text-xs">
                Published {new Date(item.publishedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
          <SheetTitle className="text-base">Manage role</SheetTitle>
          <SheetDescription>
            {item?.title ?? "Edit details, publish, close, or reopen this role."}
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
                {error ? (
                  <div className="border-destructive/20 bg-destructive/10 text-destructive mb-6 rounded-lg border px-4 py-3 text-sm">
                    {error}
                  </div>
                ) : null}
                <JobForm
                  initialValues={formValues}
                  submitLabel="Save changes"
                  onSubmit={updateJob}
                />
              </>
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t sm:flex-row sm:flex-wrap sm:justify-end">
          {item ? (
            <>
              {item.status === "draft" ? (
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => void runAction("publish")}
                >
                  Publish
                </Button>
              ) : null}
              {item.status === "published" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => void runAction("close")}
                >
                  Close role
                </Button>
              ) : null}
              {item.status === "closed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => void runAction("reopen")}
                >
                  Reopen
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={() => router.push(`/hire/roles/${jobId}`)}
              >
                View candidates
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={actionLoading}
                onClick={() => void runAction("delete")}
              >
                Delete
              </Button>
            </>
          ) : (
            <SheetClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </SheetClose>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
