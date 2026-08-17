"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminMedicalCenters } from "@/components/admin/admin-medical-centers";
import { AdminMedicalQueue } from "@/components/admin/admin-medical-queue";
import {
  AdminHubHeader,
  AdminPageTabs,
  useAdminTab,
} from "@/components/admin/admin-page-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { MedicalCenterListItem } from "@/lib/medical/types";

const TABS = [
  { value: "candidates", label: "Candidates" },
  { value: "centers", label: "Centers" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const COPY: Record<Tab, string> = {
  candidates:
    "Selected candidates. Schedule, complete with reports, or close as no-show / unfit.",
  centers:
    "Medical centers used for fitness tests — license, address, and hours.",
};

function AdminMedicalHubInner() {
  const [tab, setTab] = useAdminTab(TABS, "candidates");
  const [centers, setCenters] = useState<MedicalCenterListItem[]>([]);
  const [centersLoading, setCentersLoading] = useState(true);

  const loadCenters = useCallback(async () => {
    setCentersLoading(true);
    try {
      const res = await fetch("/api/admin/medical/centers");
      const json = (await res.json().catch(() => ({}))) as {
        items?: MedicalCenterListItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "Could not load centers");
        setCenters([]);
        return;
      }
      setCenters(json.items ?? []);
    } catch {
      toast.error("Could not load centers");
      setCenters([]);
    } finally {
      setCentersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

  return (
    <>
      <AdminHubHeader title="Medical Test" description={COPY[tab]} />
      <AdminPageTabs tabs={TABS} value={tab} onValueChange={setTab} />
      {tab === "candidates" ? <AdminMedicalQueue centers={centers} /> : null}
      {tab === "centers" ? (
        <AdminMedicalCenters
          centers={centers}
          loading={centersLoading}
          onChanged={() => void loadCenters()}
        />
      ) : null}
    </>
  );
}

export function AdminMedicalHub() {
  return (
    <Suspense fallback={<AdminMedicalHubSkeleton />}>
      <AdminMedicalHubInner />
    </Suspense>
  );
}

function AdminMedicalHubSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="mb-6 flex gap-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="space-y-3">
        {["r1", "r2", "r3", "r4", "r5", "r6"].map((id) => (
          <Skeleton key={id} className="h-12 w-full" />
        ))}
      </div>
    </>
  );
}
