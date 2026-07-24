import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AppPage } from "@/components/layout/app-page";
import { listUsersByProfileType } from "@/lib/admin/queries";

export default async function AdminAdminsPage() {
  const items = await listUsersByProfileType("admin");

  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Admins
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Console operators. Add by email to promote an existing user or queue
          an invite for first Google sign-in. Use the row menu to move someone
          back to candidate.
        </p>
      </div>
      <AdminUsersTable type="admin" initialItems={items} />
    </AppPage>
  );
}
