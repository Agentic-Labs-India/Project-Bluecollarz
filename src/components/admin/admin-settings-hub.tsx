"use client";

import { Suspense, useEffect, useState } from "react";
import { AdminKnowledgeChat } from "@/components/admin/admin-knowledge-chat";
import {
  AdminHubHeader,
  AdminPageTabs,
  useAdminTab,
} from "@/components/admin/admin-page-tabs";
import {
  AdminSettingsForm,
  type AdminSettingsSection,
} from "@/components/admin/admin-settings-form";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AdminHubSkeleton } from "@/components/layout/page-skeleton";
import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";
import type { AdminUserListItem } from "@/lib/admin/types";

const TABS = [
  { value: "admins", label: "Admin" },
  { value: "knowledge", label: "Knowledge Base" },
  { value: "test", label: "Preview AI" },
  { value: "voice", label: "Voice (Sarvam)" },
  { value: "llm", label: "Language Model" },
  { value: "grievance", label: "Grievance Officer" },
  { value: "prompts", label: "AI Agents" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const COPY: Record<Tab, string> = {
  admins: "Promote or invite admins by email.",
  knowledge: "PDFs and RAG switches for Help, onboarding, and interviews.",
  test: "Preview the knowledge base in text or voice.",
  voice: "Sarvam TTS and STT for spoken agents.",
  llm: "Chat model, embeddings, and temperatures.",
  grievance: "Officer details shown on /grievance.",
  prompts: "Prompts for every AI agent.",
};

function isConfigSection(tab: Tab): tab is AdminSettingsSection {
  return tab !== "admins" && tab !== "test";
}

function AdminConfigurationPanel({
  section,
  settings,
  defaults,
}: {
  section: AdminSettingsSection;
  settings: PlatformSettingsPublic;
  defaults: PlatformSettingsPublic;
}) {
  return (
    <AdminSettingsForm
      initial={settings}
      defaults={defaults}
      section={section}
    />
  );
}

function AdminSettingsHubInner({
  initialItems,
  initialSettings,
  initialDefaults,
}: {
  initialItems: AdminUserListItem[];
  initialSettings: PlatformSettingsPublic;
  initialDefaults: PlatformSettingsPublic;
}) {
  const [tab, setTab] = useAdminTab(TABS, "admins");
  const configOpen = isConfigSection(tab);
  const [configSeen, setConfigSeen] = useState(configOpen);
  const [testSeen, setTestSeen] = useState(tab === "test");
  const [lastConfig, setLastConfig] = useState<AdminSettingsSection>("voice");

  useEffect(() => {
    if (configOpen) {
      setConfigSeen(true);
      setLastConfig(tab);
    }
    if (tab === "test") setTestSeen(true);
  }, [configOpen, tab]);

  return (
    <>
      <AdminHubHeader title="Settings" description={COPY[tab]} />
      <AdminPageTabs tabs={TABS} value={tab} onValueChange={setTab} />
      <div hidden={tab !== "admins"}>
        <AdminUsersTable type="admin" initialItems={initialItems} />
      </div>
      {configSeen ? (
        <div hidden={!configOpen}>
          <AdminConfigurationPanel
            section={configOpen ? tab : lastConfig}
            settings={initialSettings}
            defaults={initialDefaults}
          />
        </div>
      ) : null}
      {testSeen ? (
        <div hidden={tab !== "test"}>
          <AdminKnowledgeChat active={tab === "test"} />
        </div>
      ) : null}
    </>
  );
}

export function AdminSettingsHub({
  initialItems,
  initialSettings,
  initialDefaults,
}: {
  initialItems: AdminUserListItem[];
  initialSettings: PlatformSettingsPublic;
  initialDefaults: PlatformSettingsPublic;
}) {
  return (
    <Suspense fallback={<AdminHubSkeleton />}>
      <AdminSettingsHubInner
        initialItems={initialItems}
        initialSettings={initialSettings}
        initialDefaults={initialDefaults}
      />
    </Suspense>
  );
}
