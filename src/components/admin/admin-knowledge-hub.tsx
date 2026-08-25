"use client";

import { Suspense } from "react";
import { AdminKnowledgeChat } from "@/components/admin/admin-knowledge-chat";
import { AdminKnowledgeDocuments } from "@/components/admin/admin-knowledge-documents";
import {
  AdminHubHeader,
  AdminPageTabs,
  useAdminTab,
} from "@/components/admin/admin-page-tabs";
import { Skeleton } from "@/components/ui/skeleton";

const TABS = [
  { value: "documents", label: "Documents" },
  { value: "ask", label: "Ask" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const COPY: Record<Tab, string> = {
  documents:
    "Upload PDFs and they ingest in the background. Re-uploading the same filename replaces its chunks.",
  ask: "Answers come only from ingested PDFs, with filename and page citations. Not legal advice.",
};

function KnowledgeSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function AdminKnowledgeBody() {
  const [tab, setTab] = useAdminTab(TABS, "documents");

  return (
    <>
      <AdminHubHeader title="Knowledge base" description={COPY[tab]} />
      <AdminPageTabs tabs={TABS} value={tab} onValueChange={setTab} />
      {tab === "documents" ? (
        <AdminKnowledgeDocuments />
      ) : (
        <AdminKnowledgeChat />
      )}
    </>
  );
}

export function AdminKnowledgeHub() {
  return (
    <Suspense fallback={<KnowledgeSkeleton />}>
      <AdminKnowledgeBody />
    </Suspense>
  );
}
