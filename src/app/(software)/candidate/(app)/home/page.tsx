import {
  ArrowRightIcon,
  BriefcaseIcon,
  CircleCheckIcon,
  CircleXIcon,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { CandidateApplicationsList } from "@/components/candidate/applications-list";
import { CandidateMedicalAppointmentCard } from "@/components/candidate/candidate-medical-appointment-card";
import { AppPage, AppPageTitle } from "@/components/layout/app-page";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/auth";
import { getCandidateDashboard } from "@/lib/candidate/queries";
import type { CandidateApplicationListItem } from "@/lib/jobs/applications";
import type { CandidateMedicalAppointment } from "@/lib/medical/types";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; name?: string } | undefined;
  const firstName = user?.name?.split(" ")[0] || "there";

  const { stats, applications, medicalAppointments } = user?.id
    ? await getCandidateDashboard(user.id)
    : {
        stats: { active: 0, selected: 0, closed: 0, total: 0 },
        applications: [] as CandidateApplicationListItem[],
        medicalAppointments: [] as CandidateMedicalAppointment[],
      };

  const cards = [
    { label: "Active roles", value: stats.active, icon: BriefcaseIcon },
    { label: "Selected", value: stats.selected, icon: CircleCheckIcon },
    { label: "Not qualified / closed", value: stats.closed, icon: CircleXIcon },
  ];

  return (
    <AppPage>
      <AppPageTitle>Hey {firstName}, ready to work?</AppPageTitle>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {cards.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            variant="dither"
          />
        ))}
      </div>

      {medicalAppointments.length ? (
        <div className="mb-8 w-full space-y-3">
          {medicalAppointments.map((appointment) => (
            <CandidateMedicalAppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))}
        </div>
      ) : null}

      <div className="mb-8">
        <CandidateApplicationsList applications={applications} />
      </div>

      <section className="border-border/80 bg-card rounded-none border p-6 shadow-sm">
        <h2 className="text-foreground mb-2 text-lg font-semibold">
          Pick up where you left off
        </h2>
        <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
          Browse roles matched to your profile and apply in one click when you
          are ready.
        </p>
        <Button asChild className="rounded-full">
          <Link href="/candidate/explore">
            Explore opportunities
            <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      </section>
    </AppPage>
  );
}
