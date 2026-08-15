"use client";

import { useCallback, useEffect, useState } from "react";
import { AppPage } from "@/components/layout/app-page";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";

export default function AdminSettingsPage() {
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

  return (
    <AppPage>
      <h1 className="text-foreground mb-2 text-2xl font-semibold tracking-tight">
        Settings
      </h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Grievance Officer, language model, voice, and system prompts. Changes
        save automatically and apply on the next AI or voice request.
      </p>
      {error ? <p className="text-destructive mb-4 text-sm">{error}</p> : null}
      {settings && defaults ? (
        <AdminSettingsForm initial={settings} defaults={defaults} />
      ) : !error ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : null}
    </AppPage>
  );
}
