import { AdminSupportTickets } from "@/components/admin/admin-support-tickets";
import { AppPage } from "@/components/layout/app-page";

export default function AdminSupportPage() {
  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Support
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Tickets filed by the in-app Help agent for candidates, recruiters, and
          admins. Open a row for the transcript and status controls.
        </p>
      </div>
      <AdminSupportTickets />
    </AppPage>
  );
}
