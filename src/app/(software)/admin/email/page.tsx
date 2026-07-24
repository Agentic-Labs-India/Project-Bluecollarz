import { MailIcon } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";

export default function AdminEmailPage() {
  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Email
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Outbound mail, templates, and delivery health for candidates and
          hiring teams.
        </p>
      </div>

      <div className="border-border bg-card flex flex-col items-start gap-3 border p-6 sm:p-8">
        <span className="bg-primary/10 text-primary flex size-10 items-center justify-center">
          <MailIcon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="space-y-1">
          <p className="text-foreground text-sm font-semibold">Coming online</p>
          <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
            This desk will cover transactional mail (onboarding, interview
            reminders, selection notices) and ops tools to inspect delivery. Wire
            your provider here when ready — the route and nav are already in
            place.
          </p>
        </div>
      </div>
    </AppPage>
  );
}
