import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CandidateApplicationListItem } from "@/lib/jobs/applications";
import { interviewStageTitle } from "@/lib/interviews/labels";
import { cn } from "@/lib/utils";

function applicationStatusLabel(
  status: CandidateApplicationListItem["status"],
): string {
  if (status === "selected") return "Selected";
  if (status === "rejected") return "Rejected";
  return "Applied";
}

function applicationStatusVariant(
  status: CandidateApplicationListItem["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "selected") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
}

function interviewStatusLabel(
  status: CandidateApplicationListItem["interviews"][number]["status"],
): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Not taken";
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
          Your applications
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          You haven&apos;t applied to any roles yet. Explore opportunities and
          start an application when you&apos;re ready.
        </p>
      </div>
    );
  }

  return (
    <section className="border-border/80 bg-card rounded-none border shadow-sm">
      <div className="border-border/60 border-b px-5 py-4">
        <h2 className="text-foreground text-lg font-semibold">
          Your applications
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Status, AI interviews, and outcomes for every role you&apos;ve applied
          to.
        </p>
      </div>

      <ul className="divide-border/60 divide-y">
        {applications.map((app) => (
          <li key={app.id} className="px-5 py-4">
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
                  {app.jobStatus === "closed" || app.jobStatus === "missing" ? (
                    <Badge variant="outline">Role closed</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {app.jobPay}
                  <span className="mx-1.5">·</span>
                  Applied {new Date(app.appliedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {app.interviews.map((stage) => (
                <div
                  key={stage.stageId}
                  className="border-border/70 bg-muted/30 flex items-center justify-between gap-3 border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">
                      {interviewStageTitle(stage.stageId)}
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        stage.status === "completed"
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {interviewStatusLabel(stage.status)}
                      {stage.status === "completed" && stage.overall != null
                        ? ` · ${stage.overall}/10`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      stage.status === "completed"
                        ? "default"
                        : stage.status === "in_progress"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {stage.status === "completed"
                      ? "Done"
                      : stage.status === "in_progress"
                        ? "Open"
                        : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
