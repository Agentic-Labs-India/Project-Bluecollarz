import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AppPage } from "@/components/layout/app-page";

export default function AdminRecruitersPage() {
  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Recruiters
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Accounts with hire access. Add by email to create or promote someone
          to recruiter, or set them back to candidate from the row menu.
        </p>
      </div>
      <AdminUsersTable type="hire" />
    </AppPage>
  );
}
