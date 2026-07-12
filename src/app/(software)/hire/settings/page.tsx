"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DeleteAccountSection } from "@/components/shared/delete-account-section";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

export default function HireSettingsPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-foreground mb-8 text-3xl font-semibold tracking-tight md:text-4xl">
        Settings
      </h1>

      <section className="border-border/80 bg-card divide-border/60 mb-6 divide-y rounded-none border shadow-sm">
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <Label className="text-foreground text-sm font-medium">Appearance</Label>
            <p className="text-muted-foreground mt-1 text-sm">
              Switch between light and dark mode.
            </p>
          </div>
          <Button variant="outline" onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            {isDark ? "Light mode" : "Dark mode"}
          </Button>
        </div>

        <div className="p-5">
          <Label className="text-foreground text-sm font-medium">Notifications</Label>
          <p className="text-muted-foreground mt-1 text-sm">
            Application and candidate alerts will be configurable here in a later
            release.
          </p>
        </div>
      </section>

      <section className="border-destructive/20 bg-card rounded-none border p-5 shadow-sm">
        <p className="text-destructive mb-4 text-xs font-medium uppercase tracking-wide">
          Danger zone
        </p>
        <DeleteAccountSection profileType="hire" />
      </section>
    </div>
  );
}
