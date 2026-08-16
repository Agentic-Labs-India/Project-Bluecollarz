import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationStageStepper } from "@/components/work/application-stage-stepper";
import {
  APPLICATION_STATUS_LABELS,
  type CandidateApplicationListItem,
} from "@/lib/jobs/applications";
import { buildCandidatePipeline } from "@/lib/jobs/pipeline";

function applicationStatusLabel(
  status: CandidateApplicationListItem["status"],
): string {
  if (status === "interviewing") return "Interviewing";
  return APPLICATION_STATUS_LABELS[status];
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
  return `Submitted ${date}`;
}

function needsCompleteApplication(app: CandidateApplicationListItem): boolean {
  if (app.jobStatus === "closed" || app.jobStatus === "missing") return false;
  if (app.status === "rejected" || app.status === "selected") return false;
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
      </div>

      <ul className="divide-border/60 divide-y">
        {applications.map((app) => {
          const showCompleteCta = needsCompleteApplication(app);
          const steps = buildCandidatePipeline({
            stageIds: app.stageIds,
            profileComplete: true,
            completedStageIds: app.interviews
              .filter((stage) => stage.status === "completed")
              .map((stage) => stage.stageId),
            applicationStatus: app.status,
          });

          return (
            <li key={app.id} className="px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
              <div className="mt-4 min-w-0">
                <ApplicationStageStepper steps={steps} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
