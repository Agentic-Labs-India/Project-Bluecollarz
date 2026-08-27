import { HireJobsTable } from "@/components/hire/jobs-table";
import { AppPage } from "@/components/layout/app-page";

export default function HireRolesPage() {
  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Your roles
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Create and submit roles for review. Approved roles go live for
          candidates; denied posts return to draft with an email reason.
        </p>
      </div>
      <HireJobsTable />
    </AppPage>
  );
}
