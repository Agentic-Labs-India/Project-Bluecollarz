import { CheckIcon, MinusIcon, XIcon } from "lucide-react";
import type {
  CandidatePipelineStep,
  PipelineStepStatus,
} from "@/lib/jobs/pipeline";
import { cn } from "@/lib/utils";

function circleClass(dither: boolean, status: PipelineStepStatus) {
  if (dither) {
    if (status === "skipped") return "bg-amber-400 text-amber-950";
    if (status === "done") return "bg-white text-primary";
    if (status === "current")
      return "border-2 border-white bg-white/15 text-white";
    if (status === "failed") return "bg-white text-destructive";
    return "border border-white/40 bg-primary text-white/70";
  }
  if (status === "skipped") return "bg-amber-500 text-white";
  if (status === "done") return "bg-primary text-primary-foreground";
  if (status === "current")
    return "border-primary text-primary border-2 bg-background";
  if (status === "failed") return "bg-destructive text-destructive-foreground";
  return "border-border text-muted-foreground border bg-background";
}

function labelClass(dither: boolean, status: PipelineStepStatus) {
  if (dither) {
    if (status === "skipped") return "text-amber-200";
    if (status === "pending") return "text-white/65";
    return "text-white";
  }
  if (status === "skipped") return "text-amber-600";
  if (status === "failed") return "text-destructive";
  if (status === "pending") return "text-muted-foreground";
  return "text-foreground";
}

function reachedIndex(steps: CandidatePipelineStep[]): number {
  const failedAt = steps.findIndex((step) => step.status === "failed");
  if (failedAt >= 0) return failedAt;
  const currentAt = steps.findIndex((step) => step.status === "current");
  if (currentAt >= 0) return currentAt;
  let cleared = 0;
  for (let i = 0; i < steps.length; i++) {
    const status = steps[i]?.status;
    if (status === "done" || status === "skipped") cleared = i;
    else break;
  }
  return cleared;
}

export function ApplicationStageStepper({
  steps,
  variant = "default",
}: {
  steps: CandidatePipelineStep[];
  variant?: "default" | "dither";
}) {
  const dither = variant === "dither";
  const last = steps.length - 1;
  const fill = last > 0 ? reachedIndex(steps) / last : 0;

  return (
    <ol className="relative flex w-full min-w-0 justify-between">
      {last > 0 ? (
        <>
          <span
            aria-hidden
            className={cn(
              "absolute top-2.5 right-2.5 left-2.5 h-px",
              dither ? "bg-white/30" : "bg-border",
            )}
          />
          <span
            aria-hidden
            className={cn(
              "absolute top-2.5 left-2.5 h-px",
              dither ? "bg-white" : "bg-primary",
            )}
            style={{ width: `calc(${fill} * (100% - 1.25rem))` }}
          />
        </>
      ) : null}
      {steps.map((step, index) => {
        const edge = index === 0 ? "start" : index === last ? "end" : "mid";
        return (
          <li
            key={step.id}
            className={cn(
              "relative z-10 flex flex-col",
              edge === "start" && "items-start",
              edge === "end" && "items-end",
              edge === "mid" && "items-center",
            )}
            aria-current={step.status === "current" ? "step" : undefined}
            aria-label={
              step.status === "skipped"
                ? `${step.label}, not required`
                : `${step.label}, ${step.status}`
            }
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold",
                circleClass(dither, step.status),
              )}
            >
              {step.status === "skipped" ? (
                <MinusIcon className="size-2.5" />
              ) : step.status === "done" ? (
                <CheckIcon className="size-2.5" />
              ) : step.status === "failed" ? (
                <XIcon className="size-2.5" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "mt-1 text-[8px] leading-tight font-medium whitespace-nowrap",
                edge === "start" && "text-left",
                edge === "end" && "text-right",
                edge === "mid" && "text-center",
                labelClass(dither, step.status),
              )}
            >
              {step.shortLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
