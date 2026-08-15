"use client";

import { Suspense } from "react";
import { AdminJobVerification } from "@/components/admin/admin-job-verification";
import {
  AdminHubHeader,
  AdminPageTabs,
  useAdminTab,
} from "@/components/admin/admin-page-tabs";
import { AdminRecruiterInquiries } from "@/components/admin/admin-recruiter-inquiries";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import type { AdminUserListItem } from "@/lib/admin/queries";

const TABS = [
  { value: "accounts", label: "Accounts" },
  { value: "jobs", label: "Jobs" },
  { value: "inquiries", label: "Inquiries" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const COPY: Record<Tab, string> = {
  accounts:
    "Add by email to promote an existing user or queue an invite for first sign-in.",
  jobs: "Review recruiter job posts awaiting approval. Approve to publish; deny returns the role to draft.",
  inquiries:
    "Recruiter access requests from the for-recruiters form. Approve to provision hire access.",
};

function AdminRecruitersHubInner({
  initialItems,
}: {
  initialItems: AdminUserListItem[];
}) {
  const [tab, setTab] = useAdminTab(TABS, "accounts");

  return (
    <>
      <AdminHubHeader title="Recruiters" description={COPY[tab]} />
      <AdminPageTabs tabs={TABS} value={tab} onValueChange={setTab} />
      <div hidden={tab !== "accounts"}>
        <AdminUsersTable type="hire" initialItems={initialItems} />
      </div>
      {tab === "jobs" ? <AdminJobVerification /> : null}
      {tab === "inquiries" ? <AdminRecruiterInquiries /> : null}
    </>
  );
}

export function AdminRecruitersHub({
  initialItems,
}: {
  initialItems: AdminUserListItem[];
}) {
  return (
    <Suspense fallback={null}>
      <AdminRecruitersHubInner initialItems={initialItems} />
    </Suspense>
  );
}
