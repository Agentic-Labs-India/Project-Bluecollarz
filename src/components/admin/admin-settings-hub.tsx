"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";
import type { AdminUserListItem } from "@/lib/admin/queries";
import { placeholderKeys } from "@/lib/utils";

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

function SettingsSkeleton({ section }: { section: AdminSettingsSection }) {
  if (section === "prompts") {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {placeholderKeys(6).map((key) => (
          <Skeleton key={key} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (section === "knowledge") {
    return <Skeleton className="h-64 w-full" />;
  }
  return (
    <div className="max-w-xl space-y-4">
      {placeholderKeys(6).map((key) => (
        <div key={key} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function AdminConfigurationPanel({
  section,
}: {
  section: AdminSettingsSection;
}) {
  const [settings, setSettings] = useState<PlatformSettingsPublic | null>(null);
  const [defaults, setDefaults] = useState<PlatformSettingsPublic | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/settings");
    const json = (await res.json().catch(() => ({}))) as {
      settings?: PlatformSettingsPublic;
      defaults?: PlatformSettingsPublic;
      error?: string;
    };
    if (!res.ok || !json.settings || !json.defaults) {
      setError(json.error || "Failed to load settings");
      return;
    }
    setSettings(json.settings);
    setDefaults(json.defaults);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }
  if (!settings || !defaults) {
    return <SettingsSkeleton section={section} />;
  }
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
}: {
  initialItems: AdminUserListItem[];
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
          <AdminConfigurationPanel section={configOpen ? tab : lastConfig} />
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
}: {
  initialItems: AdminUserListItem[];
}) {
  return (
    <Suspense fallback={<AdminHubSkeleton />}>
      <AdminSettingsHubInner initialItems={initialItems} />
    </Suspense>
  );
}
