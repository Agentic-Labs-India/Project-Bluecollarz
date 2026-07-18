import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CircleCheckIcon,
  CircleXIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidateApplicationsList } from "@/components/candidate/candidate-applications-list";
import { StatCard } from "@/components/shared/stat-card";
import { auth } from "@/lib/auth/auth";
import {
  getCandidateApplicationStats,
  getCandidateApplications,
} from "@/lib/jobs/queries";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; name?: string } | undefined;
  const firstName = user?.name?.split(" ")[0] || "there";

  const [stats, applications] = user?.id
    ? await Promise.all([
        getCandidateApplicationStats(user.id),
        getCandidateApplications(user.id),
      ])
    : [
        { active: 0, selected: 0, closed: 0, total: 0 },
        [] as Awaited<ReturnType<typeof getCandidateApplications>>,
      ];

  const cards = [
    { label: "Active applications", value: stats.active, icon: BriefcaseIcon },
    { label: "Selected", value: stats.selected, icon: CircleCheckIcon },
    { label: "Not qualified / closed", value: stats.closed, icon: CircleXIcon },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-10">
        <p className="text-muted-foreground mb-2 text-sm">Welcome back</p>
        <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          Hey {firstName}, ready to work?
        </h1>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {cards.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>

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
    </div>
  );
}
