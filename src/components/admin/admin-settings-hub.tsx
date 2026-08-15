"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
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
import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";
import type { AdminUserListItem } from "@/lib/admin/queries";
import { Skeleton } from "@/components/ui/skeleton";

const TABS = [
  { value: "admins", label: "Admin" },
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
  voice:
    "Sarvam TTS and STT. Changes save automatically and apply on the next voice request.",
  llm: "Vercel AI Gateway model and per-surface temperature. Applies on the next AI request.",
  grievance:
    "Shown on /grievance. Email is published; add a named officer, phone, and street address when appointed.",
  prompts:
    "System prompts for help, onboarding, interviews, scoring, and writers.",
  flow: "Candidate, recruiter, and admin — the real sequence, and where this page feeds every AI call.",
};

function isConfigSection(tab: Tab): tab is AdminSettingsSection {
  return tab !== "admins";
}

function SettingsSkeleton({ section }: { section: AdminSettingsSection }) {
  if (section === "flow") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (section === "prompts") {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="max-w-xl space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
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

  useEffect(() => {
    if (configOpen) setConfigSeen(true);
  }, [configOpen]);

  return (
    <>
      <AdminHubHeader title="Settings" description={COPY[tab]} />
      <AdminPageTabs tabs={TABS} value={tab} onValueChange={setTab} />
      <div hidden={tab !== "admins"}>
        <AdminUsersTable type="admin" initialItems={initialItems} />
      </div>
      {configSeen ? (
        <div hidden={!configOpen}>
          <AdminConfigurationPanel section={configOpen ? tab : "voice"} />
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
    <Suspense fallback={<SettingsSkeleton section="voice" />}>
      <AdminSettingsHubInner initialItems={initialItems} />
    </Suspense>
  );
}
