import { LifeBuoyIcon } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";

export default function AdminSupportPage() {
  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Support
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Candidate and recruiter support tooling — tickets, account lookups,
          and escalation.
        </p>
      </div>

      <div className="border-border bg-card flex flex-col items-start gap-3 border p-6 sm:p-8">
        <span className="bg-primary/10 text-primary flex size-10 items-center justify-center">
          <LifeBuoyIcon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="space-y-1">
          <p className="text-foreground text-sm font-semibold">Coming online</p>
          <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
            Use this surface for support queues and user lookups. Until the
            queue is connected, route product issues to{" "}
            <span className="text-foreground">support@BlueCollarz.ai</span> and
            access requests to sales.
          </p>
        </div>
      </div>
    </AppPage>
  );
}
