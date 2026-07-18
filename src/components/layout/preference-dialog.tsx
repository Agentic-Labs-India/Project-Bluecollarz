"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserPreferences } from "@/lib/user/preferences";

export type PreferenceKind = "cookies" | "notifications";

const COPY: Record<
  PreferenceKind,
  {
    title: string;
    description: string;
    details: string[];
    toggleLabel: string;
  }
> = {
  cookies: {
    title: "Cookie preferences",
    description:
      "Cookies help BlueCollarz stay signed in, remember your settings, and keep the product working smoothly.",
    details: [
      "Essential cookies keep you logged in and protect your account.",
      "Preference cookies remember choices like theme and layout.",
      "Turning cookies off may require signing in more often and can reset some saved settings.",
    ],
    toggleLabel: "Allow cookies",
  },
  notifications: {
    title: "Notification preferences",
    description:
      "Notifications keep you informed about applications, interviews, and important account updates.",
    details: [
      "Job and application alerts when something needs your attention.",
      "Interview reminders and status updates.",
      "You can turn these off anytime; critical account messages may still apply.",
    ],
    toggleLabel: "Allow notifications",
  },
};

export function PreferenceDialog({
  kind,
  open,
  onOpenChange,
  enabled,
  onEnabledChange,
  saving,
}: {
  kind: PreferenceKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  saving?: boolean;
}) {
  const copy = COPY[kind];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-88 max-h-88 w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pe-12">
          <DialogTitle className="text-base">{copy.title}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ul className="text-muted-foreground list-disc space-y-2 ps-4 text-sm">
            {copy.details.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`pref-${kind}`} className="text-sm font-medium">
              {copy.toggleLabel}
            </Label>
            <Switch
              id={`pref-${kind}`}
              checked={enabled}
              disabled={saving}
              onCheckedChange={onEnabledChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export async function fetchUserPreferences(): Promise<UserPreferences> {
  const res = await fetch("/api/user/preferences");
  if (!res.ok) {
    throw new Error("Failed to load preferences");
  }
  const data = (await res.json()) as { preferences: UserPreferences };
  return data.preferences;
}

export async function patchUserPreferences(
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const res = await fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error("Failed to save preferences");
  }
  const data = (await res.json()) as { preferences: UserPreferences };
  return data.preferences;
}
