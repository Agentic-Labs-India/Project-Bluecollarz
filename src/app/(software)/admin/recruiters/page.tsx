import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AppPage } from "@/components/layout/app-page";
import { listUsersByProfileType } from "@/lib/admin/queries";

export default async function AdminRecruitersPage() {
  const items = await listUsersByProfileType("hire");

  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Recruiters
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Add by email to promote an existing user
          or queue an invite for first sign-in.
        </p>
      </div>
      <AdminUsersTable type="hire" initialItems={items} />
    </AppPage>
  );
}
