import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CandidateApplicationListItem } from "@/lib/jobs/applications";

function applicationStatusLabel(
  status: CandidateApplicationListItem["status"],
): string {
  if (status === "selected") return "Selected";
  if (status === "rejected") return "Rejected";
  if (status === "interviewing") return "Interviewing";
  return "Applied";
}

function applicationStatusVariant(
  status: CandidateApplicationListItem["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "selected") return "default";
  if (status === "rejected") return "destructive";
  if (status === "interviewing") return "outline";
  return "secondary";
}

function activityLabel(app: CandidateApplicationListItem): string {
  const date = new Date(app.appliedAt).toLocaleDateString();
  if (app.status === "interviewing") return `Started ${date}`;
  return `Applied ${date}`;
}

/**
 * Show a single continue CTA while the candidate is still working through
 * interviews / apply — not for terminal outcomes (selected / rejected).
 */
function needsCompleteApplication(app: CandidateApplicationListItem): boolean {
  if (app.jobStatus === "closed" || app.jobStatus === "missing") return false;
  if (app.status === "rejected" || app.status === "selected") return false;
  // Pre-apply pipeline, or applied with a stage still open.
  if (app.status === "interviewing") return true;
  return app.interviews.some((stage) => stage.status === "in_progress");
}

export function CandidateApplicationsList({
  applications,
}: {
  applications: CandidateApplicationListItem[];
}) {
  if (!applications.length) {
    return (
      <div className="border-border/80 bg-card rounded-none border p-6 shadow-sm">
        <h2 className="text-foreground mb-2 text-lg font-semibold">
          Your roles
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Roles you interview for or apply to will show up here. Explore
          opportunities to get started.
        </p>
      </div>
    );
  }

  return (
    <section className="border-border/80 bg-card rounded-none border shadow-sm">
      <div className="border-border/60 border-b px-5 py-4">
        <h2 className="text-foreground text-lg font-semibold">Your roles</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Status and outcomes for every role you&apos;ve interviewed for or
          applied to.
        </p>
      </div>

      <ul className="divide-border/60 divide-y">
        {applications.map((app) => {
          const showCompleteCta = needsCompleteApplication(app);

          return (
            <li key={app.id} className="px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/candidate/explore?jobId=${app.jobId}`}
                      className="text-foreground truncate text-base font-medium hover:underline"
                    >
                      {app.jobTitle}
                    </Link>
                    <Badge variant={applicationStatusVariant(app.status)}>
                      {applicationStatusLabel(app.status)}
                    </Badge>
                    {app.jobStatus === "closed" ||
                    app.jobStatus === "missing" ? (
                      <Badge variant="outline">Role closed</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {app.jobPay}
                    <span className="mx-1.5">·</span>
                    {activityLabel(app)}
                  </p>
                </div>

                {showCompleteCta ? (
                  <Button asChild className="w-full shrink-0 sm:w-auto">
                    <Link href={`/candidate/explore?jobId=${app.jobId}`}>
                      Complete Application
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
