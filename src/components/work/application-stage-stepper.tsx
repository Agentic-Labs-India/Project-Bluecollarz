import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidatePipelineStep } from "@/lib/jobs/pipeline";

export function ApplicationStageStepper({
  steps,
  variant = "default",
}: {
  steps: CandidatePipelineStep[];
  variant?: "default" | "dither";
}) {
  const dither = variant === "dither";

  return (
    <ol className="flex w-full min-w-0">
      {steps.map((step, index) => {
        const done = step.status === "done";
        const current = step.status === "current";
        const failed = step.status === "failed";
        return (
          <li
            key={step.id}
            className="relative flex min-w-0 flex-1 flex-col items-center"
            aria-current={current ? "step" : undefined}
            aria-label={`${step.label}, ${step.status}`}
          >
            {index > 0 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-2.5 right-1/2 h-px w-full",
                  dither
                    ? done || failed
                      ? "bg-white"
                      : "bg-white/30"
                    : done || failed
                      ? "bg-primary"
                      : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold",
                dither && done && "bg-white text-primary",
                dither &&
                  current &&
                  "border-2 border-white bg-white/15 text-white",
                dither && failed && "bg-white text-destructive",
                dither &&
                  !done &&
                  !current &&
                  !failed &&
                  "border border-white/40 text-white/70",
                !dither && done && "bg-primary text-primary-foreground",
                !dither &&
                  current &&
                  "border-primary text-primary border-2 bg-background",
                !dither &&
                  failed &&
                  "bg-destructive text-destructive-foreground",
                !dither &&
                  !done &&
                  !current &&
                  !failed &&
                  "border-border text-muted-foreground border bg-background",
              )}
            >
              {done ? (
                <CheckIcon className="size-2.5" />
              ) : failed ? (
                <XIcon className="size-2.5" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "mt-1 w-full px-px text-center text-[8px] leading-tight font-medium",
                dither
                  ? current || done || failed
                    ? "text-white"
                    : "text-white/65"
                  : current || done
                    ? "text-foreground"
                    : failed
                      ? "text-destructive"
                      : "text-muted-foreground",
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
