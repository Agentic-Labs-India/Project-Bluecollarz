"use client";

import { Suspense } from "react";
import { AdminBreachRegister } from "@/components/admin/admin-breach-register";
import {
  AdminHubHeader,
  AdminPageTabs,
  useAdminTab,
} from "@/components/admin/admin-page-tabs";
import { AdminRightsQueue } from "@/components/admin/admin-rights-queue";

const TABS = [
  { value: "rights", label: "Rights" },
  { value: "breaches", label: "Breaches" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const COPY: Record<Tab, string> = {
  rights:
    "Acknowledge and resolve access, correction, erasure, withdrawal, nomination, and grievance requests.",
  breaches:
    "Log personal data breaches, prepare Board / Data Principal notices, and track acknowledgment.",
};

function AdminComplianceHubInner() {
  const [tab, setTab] = useAdminTab(TABS, "rights");

  return (
    <>
      <AdminHubHeader title="Compliance" description={COPY[tab]} />
      <AdminPageTabs tabs={TABS} value={tab} onValueChange={setTab} />
      {tab === "rights" ? <AdminRightsQueue /> : <AdminBreachRegister />}
    </>
  );
}

export function AdminComplianceHub() {
  return (
    <Suspense fallback={null}>
      <AdminComplianceHubInner />
    </Suspense>
  );
}
