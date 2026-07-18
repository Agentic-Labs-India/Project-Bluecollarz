"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  AwardIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircle2Icon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  Trash2Icon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AppPage } from "@/components/layout/app-page";
import { StatCard } from "@/components/shared/stat-card";
import type { HireOverview } from "@/lib/hire";
import {
  COMPANY_SIZES,
  getMissingHireFields,
  HIRE_FIELD_LABELS,
  isHireProfileComplete,
  type HireCertificate,
  type HireProfileData,
} from "@/lib/hire/profile";

const STATUS_LABELS: Record<string, string> = {
  published: "Open",
  draft: "Draft",
  closed: "Closed",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function newCertificate(): HireCertificate {
  return {
    id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    issuer: "",
  };
}

export function HireProfileView({
  overview,
  showCompletePrompt = false,
}: {
  overview: HireOverview;
  profileComplete?: boolean;
  showCompletePrompt?: boolean;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<HireProfileData>(overview.profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [completePrompt, setCompletePrompt] = useState(showCompletePrompt);

  const profileComplete = isHireProfileComplete(profile);
  const missingLabels = getMissingHireFields(profile).map(
    (field) => HIRE_FIELD_LABELS[field],
  );

  const personName = overview.account.name || "Your account";
  const email = overview.account.email || "—";
  const phone = overview.account.phoneNumber || "—";
  const image = overview.account.image || "";
  const headline = profile.companyName.trim() || personName;
  const initial = headline.charAt(0).toUpperCase() || "H";

  const update = <K extends keyof HireProfileData>(
    key: K,
    value: HireProfileData[K],
  ) => {
    setSavedFlash(false);
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const updateCertificate = (
    id: string,
    key: keyof HireCertificate,
    value: string | number | undefined,
  ) => {
    setSavedFlash(false);
    setProfile((prev) => ({
      ...prev,
      certificates: prev.certificates.map((cert) =>
        cert.id === id ? { ...cert, [key]: value } : cert,
      ),
    }));
  };

  const addCertificate = () => {
    setSavedFlash(false);
    setProfile((prev) => ({
      ...prev,
      certificates: [...prev.certificates, newCertificate()],
    }));
  };

  const removeCertificate = (id: string) => {
    setSavedFlash(false);
    setProfile((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((cert) => cert.id !== id),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: HireProfileData = {
        ...profile,
        certificates: profile.certificates
          .map((cert) => ({
            id: cert.id,
            name: cert.name.trim(),
            issuer: cert.issuer?.trim() || undefined,
            year: typeof cert.year === "number" ? cert.year : undefined,
          }))
          .filter((cert) => cert.name.length > 0),
      };

      const res = await fetch("/api/hire/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save profile");
      const next = json.profile as HireProfileData;
      setProfile(next);
      setSavedFlash(true);
      if (isHireProfileComplete(next)) {
        setCompletePrompt(false);
        if (showCompletePrompt) {
          router.push("/hire/roles/new");
          return;
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: "Open roles", value: overview.roles.published, icon: BriefcaseIcon },
    {
      label: "In pipeline",
      value: overview.applicants.total,
      icon: UsersIcon,
    },
    { label: "Selected", value: overview.applicants.selected, icon: CheckCircle2Icon },
    { label: "Hires / month", value: overview.hiresThisMonth, icon: TrophyIcon },
  ];

  const roleBreakdown = [
    { label: "Open", value: overview.roles.published },
    { label: "Drafts", value: overview.roles.draft },
    { label: "Closed", value: overview.roles.closed },
  ];
  const totalRoles = overview.roles.total;

  return (
    <AppPage>
      <div className="mb-6 md:mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          Hiring profile
        </h1>
      </div>

      {completePrompt || !profileComplete ? (
        <div className="border-border bg-muted/40 mb-6 rounded-none border px-4 py-3 text-sm">
          <p className="text-foreground font-medium">
            {completePrompt
              ? "Complete your company profile before posting a role."
              : "Your company profile is incomplete."}
          </p>
          {missingLabels.length ? (
            <p className="text-muted-foreground mt-1 break-words">
              Still needed: {missingLabels.join(", ")}.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── Identity + editable company fields ── */}
      <div className="border-border/80 bg-card mb-6 w-full min-w-0 rounded-none border p-4 shadow-sm sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
          <Avatar className="size-16 shrink-0 sm:size-20">
            <AvatarImage src={image} alt={headline} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-foreground truncate text-lg font-semibold sm:text-xl">
              {headline}
            </h2>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              Managed by {personName}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <BuildingIcon className="size-3" />
                Hiring team
              </Badge>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <CalendarIcon className="size-3 shrink-0" />
                Member since {formatDate(overview.account.memberSince)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-border/60 mt-6 grid gap-3 border-t pt-6 text-sm sm:grid-cols-2">
          <div className="text-muted-foreground flex min-w-0 items-center gap-2">
            <MailIcon className="size-4 shrink-0" />
            <span className="text-foreground truncate">{email}</span>
          </div>
          <div className="text-muted-foreground flex min-w-0 items-center gap-2">
            <PhoneIcon className="size-4 shrink-0" />
            <span className="text-foreground truncate">{phone}</span>
          </div>
        </div>

        {error ? (
          <div className="border-destructive/20 bg-destructive/10 text-destructive mt-6 rounded-lg border px-4 py-3 text-sm break-words">
            {error}
          </div>
        ) : null}

        <div className="border-border/60 mt-6 space-y-5 border-t pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                value={profile.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="e.g. Way Abroad Inc."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={profile.tagline}
                onChange={(e) => update("tagline", e.target.value)}
                placeholder="Building the future of global hiring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={profile.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={profile.industry}
                onChange={(e) => update("industry", e.target.value)}
                placeholder="Technology, Staffing…"
              />
            </div>

            <div className="space-y-2">
              <Label>Company size</Label>
              <Select
                value={profile.companySize || undefined}
                onValueChange={(v) => update("companySize", v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profile.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="Bengaluru, India · Remote"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="about">About the company</Label>
            <Textarea
              id="about"
              value={profile.about}
              onChange={(e) => update("about", e.target.value)}
              placeholder="Tell candidates about your mission, team, and what makes you a great place to work…"
              rows={5}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <AwardIcon className="text-primary size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-semibold">
                    Certifications & awards
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Add as many as you like
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                onClick={addCertificate}
              >
                <PlusIcon className="size-4" />
                Add
              </Button>
            </div>

            {profile.certificates.length === 0 ? (
              <p className="text-muted-foreground border-border/60 rounded-lg border border-dashed px-4 py-6 text-center text-xs">
                No certifications added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {profile.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="border-border/70 space-y-2 rounded-none border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        className="min-w-0 flex-1"
                        value={cert.name}
                        onChange={(e) =>
                          updateCertificate(cert.id, "name", e.target.value)
                        }
                        placeholder="Certificate / award name"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeCertificate(cert.id)}
                        aria-label="Remove certificate"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        value={cert.issuer ?? ""}
                        onChange={(e) =>
                          updateCertificate(cert.id, "issuer", e.target.value)
                        }
                        placeholder="Issuer"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1900}
                        max={2100}
                        value={cert.year ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (!raw) {
                            updateCertificate(cert.id, "year", undefined);
                            return;
                          }
                          const n = Number(raw);
                          updateCertificate(
                            cert.id,
                            "year",
                            Number.isFinite(n) ? Math.trunc(n) : undefined,
                          );
                        }}
                        placeholder="Year"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save profile"}
            </Button>
            {savedFlash ? (
              <p className="text-muted-foreground text-sm">Saved</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            className="min-w-0 p-4 sm:p-5"
          />
        ))}
      </div>

      <div className="grid w-full min-w-0 gap-6 lg:grid-cols-5">
        <section className="border-border/80 bg-card w-full min-w-0 rounded-none border p-4 shadow-sm sm:p-6 lg:col-span-2">
          <h3 className="text-foreground mb-1 text-lg font-semibold">
            Roles overview
          </h3>
          <p className="text-muted-foreground mb-5 text-sm">
            {totalRoles} {totalRoles === 1 ? "role" : "roles"} posted in total
          </p>

          <div className="space-y-4">
            {roleBreakdown.map((row) => {
              const pct = totalRoles > 0 ? (row.value / totalRoles) * 100 : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="text-foreground font-medium tabular-nums">
                      {row.value}
                    </span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Button asChild variant="outline" size="sm" className="mt-6 w-full">
            <Link href="/hire/roles">
              Manage roles
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </section>

        <section className="border-border/80 bg-card w-full min-w-0 rounded-none border p-4 shadow-sm sm:p-6 lg:col-span-3">
          <h3 className="text-foreground mb-1 text-lg font-semibold">
            Active roles
          </h3>
          <p className="text-muted-foreground mb-5 text-sm">
            Currently open and accepting applications
          </p>

          {overview.activeRoles.length > 0 ? (
            <div className="space-y-3">
              {overview.activeRoles.map((role) => (
                <Link
                  key={role.id}
                  href={`/hire/roles/${role.id}`}
                  className="border-border/70 hover:bg-muted/50 hover:border-border group flex flex-col gap-3 rounded-none border px-3 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">
                      {role.title}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {role.pay}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-foreground text-sm font-semibold tabular-nums">
                        {role.applicants}
                      </p>
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                        {role.applicants === 1 ? "applicant" : "applicants"}
                      </p>
                    </div>
                    <Badge variant="default">{STATUS_LABELS[role.status]}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-border/60 rounded-none border border-dashed px-4 py-10 text-center">
              <p className="text-muted-foreground text-sm">No open roles yet.</p>
              <Button asChild size="sm" className="mt-3">
                <Link
                  href={
                    profileComplete
                      ? "/hire/roles/new"
                      : "/hire/profile?complete=required"
                  }
                >
                  Post a role
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </AppPage>
  );
}
