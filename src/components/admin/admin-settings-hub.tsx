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
  { value: "test", label: "Test" },
  { value: "voice", label: "Voice (Sarvam)" },
  { value: "llm", label: "Language Model" },
  { value: "grievance", label: "Grievance Officer" },
  { value: "prompts", label: "System Prompts" },
  { value: "flow", label: "Flow" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const COPY: Record<Tab, string> = {
  admins:
    "Add by email to promote an existing user or queue an invite for first sign-in.",
  knowledge:
    "Upload PDFs and switch RAG on for Help, onboarding, and interviews. Off until you turn a surface on.",
  test: "Ask in text or voice. Voice uses Sarvam STT/TTS and the language you pick. Answers use the Language Model and uploaded PDFs.",
  voice:
    "Sarvam TTS and STT. Knowledge Base Test uses these for voice. Changes save automatically and apply on the next voice request.",
  llm: "Vercel AI Gateway chat and embedding models, plus per-surface temperature. Knowledge Base Test and RAG use this chat model, the embedding model, and the knowledge temperature.",
  grievance:
    "Shown on /grievance. Email is published; add a named officer, phone, and street address when appointed.",
  prompts:
    "System prompts for help, onboarding, interviews, scoring, writers, and the knowledge base.",
  flow: "Candidate, recruiter, and admin — the real sequence, and where this page feeds every AI call.",
};

function isConfigSection(tab: Tab): tab is AdminSettingsSection {
  return tab !== "admins" && tab !== "test";
}

function SettingsSkeleton({ section }: { section: AdminSettingsSection }) {
  if (section === "flow") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {placeholderKeys(3, "col").map((colKey) => (
          <div key={colKey} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            {placeholderKeys(8, colKey).map((key) => (
              <Skeleton key={key} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }
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
