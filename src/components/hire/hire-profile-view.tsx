import Link from "next/link";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircle2Icon,
  GlobeIcon,
  MailIcon,
  PhoneIcon,
  UsersIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppPage } from "@/components/layout/app-page";
import { StatCard } from "@/components/shared/stat-card";
import { HireOnboardingPackView } from "@/components/hire/onboarding/pack-view";
import type { HireOverview } from "@/lib/hire";
import type { HireOnboardingData } from "@/lib/hire/onboarding/types";

const STATUS_LABELS: Record<string, string> = {
  published: "Live",
  underVerification: "In review",
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

function formatPhone(
  countryCode: number | null,
  phone: number | null,
): string | null {
  if (phone == null) return null;
  if (countryCode != null) return `+${countryCode} ${phone}`;
  return String(phone);
}

export function HireProfileView({
  overview,
  onboarding,
}: {
  overview: HireOverview;
  onboarding: HireOnboardingData | null;
}) {
  const { profile, account } = overview;
  const company =
    onboarding?.identity.legalName.trim() ||
    profile.companyName.trim() ||
    "Your company";
  const contact =
    onboarding?.contacts.owner.name.trim() ||
    profile.contactName.trim() ||
    account.name?.trim() ||
    "Hiring contact";
  const email =
    onboarding?.contacts.owner.email.trim() || account.email || "—";
  const phone = formatPhone(
    onboarding?.contacts.owner.phoneCountryCode ?? account.phoneCountryCode,
    onboarding?.contacts.owner.phoneNumber ?? account.phoneNumber,
  );
  const website = onboarding?.identity.website.trim() || profile.website;
  const image = account.image || "";
  const initial = company.charAt(0).toUpperCase() || "H";

  const stats = [
    { label: "Open roles", value: overview.roles.published, icon: BriefcaseIcon },
    {
      label: "In pipeline",
      value: overview.applicants.total,
      icon: UsersIcon,
    },
    { label: "Selected", value: overview.applicants.selected, icon: CheckCircle2Icon },
  ];

  const roleBreakdown = [
    { label: "Open", value: overview.roles.published },
    { label: "In review", value: overview.roles.underVerification },
    { label: "Drafts", value: overview.roles.draft },
    { label: "Closed", value: overview.roles.closed },
  ];
  const totalRoles = overview.roles.total;

  return (
    <AppPage>
      <div className="mb-6 md:mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Hiring profile
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Company record from onboarding. These details cannot be edited here.
        </p>
      </div>

      <div className="border-border/80 bg-card mb-6 w-full min-w-0 border p-4 shadow-sm sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
          <Avatar className="size-16 shrink-0 sm:size-20">
            <AvatarImage src={image} alt={company} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-foreground truncate text-lg font-semibold sm:text-xl">
              {company}
            </h2>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              Contact · {contact}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <BuildingIcon className="size-3" />
                Hiring team
              </Badge>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <CalendarIcon className="size-3 shrink-0" />
                Member since {formatDate(account.memberSince)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-border/60 mt-6 grid gap-3 border-t pt-6 text-sm sm:grid-cols-2">
          <div className="text-muted-foreground flex min-w-0 items-center gap-2">
            <MailIcon className="size-4 shrink-0" />
            <span className="text-foreground truncate">{email}</span>
          </div>
          {phone ? (
            <div className="text-muted-foreground flex min-w-0 items-center gap-2">
              <PhoneIcon className="size-4 shrink-0" />
              <span className="text-foreground truncate">{phone}</span>
            </div>
          ) : null}
          {website ? (
            <div className="text-muted-foreground flex min-w-0 items-center gap-2 sm:col-span-2">
              <GlobeIcon className="size-4 shrink-0" />
              <a
                href={
                  website.startsWith("http") ? website : `https://${website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground truncate underline-offset-2 hover:underline"
              >
                {website}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {onboarding ? (
        <div className="border-border/80 bg-card mb-6 w-full min-w-0 border p-4 shadow-sm sm:p-6">
          <HireOnboardingPackView
            data={onboarding}
            about={profile.about}
            companySize={profile.companySize}
          />
        </div>
      ) : null}

      <div className="mb-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            className="min-w-0 w-full p-4 sm:p-5"
          />
        ))}
      </div>

      <div className="grid w-full min-w-0 gap-6 lg:grid-cols-5">
        <section className="border-border/80 bg-card w-full min-w-0 border p-4 shadow-sm sm:p-6 lg:col-span-2">
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

        <section className="border-border/80 bg-card w-full min-w-0 border p-4 shadow-sm sm:p-6 lg:col-span-3">
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
                  className="border-border/70 hover:bg-muted/50 hover:border-border group flex flex-col gap-3 border px-3 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
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
            <div className="border-border/60 border border-dashed px-4 py-10 text-center">
              <p className="text-muted-foreground text-sm">No open roles yet.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/hire/roles/new">Post a role</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </AppPage>
  );
}
