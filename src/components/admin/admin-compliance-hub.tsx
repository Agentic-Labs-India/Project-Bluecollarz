"use client";

import { AdminBreachRegister } from "@/components/admin/admin-breach-register";
import { AdminLegalSafetyQueue } from "@/components/admin/admin-legal-safety-queue";
import {
  AdminHubHeader,
  AdminPageTabs,
  useAdminTab,
} from "@/components/admin/admin-page-tabs";
import { AdminRightsQueue } from "@/components/admin/admin-rights-queue";

const TABS = [
  { value: "rights", label: "Rights" },
  { value: "breaches", label: "Breaches" },
  { value: "legal", label: "Legal safety" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const COPY: Record<Tab, string> = {
  rights:
    "Acknowledge and resolve access, correction, erasure, withdrawal, nomination, restriction, objection, portability, and grievance.",
  breaches:
    "Log personal data breaches, prepare Board / Data Principal notices, and track acknowledgment.",
  legal:
    "Serious-offence cases. The machine may only open legal review. Filing is a human act. The accused is not notified.",
};

export function AdminComplianceHub() {
  const [tab, setTab] = useAdminTab(TABS, "rights");

  return (
    <>
      <AdminHubHeader title="Compliance" description={COPY[tab]} />
      <AdminPageTabs tabs={TABS} value={tab} onValueChange={setTab} />
      {tab === "rights" ? (
        <AdminRightsQueue />
      ) : tab === "breaches" ? (
        <AdminBreachRegister />
      ) : (
        <AdminLegalSafetyQueue />
      )}
    </>
  );
}
