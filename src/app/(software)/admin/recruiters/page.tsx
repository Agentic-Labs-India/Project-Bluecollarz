import { AdminRecruitersHub } from "@/components/admin/admin-recruiters-hub";
import { AppPage } from "@/components/layout/app-page";
import { listUsersByProfileType } from "@/lib/admin/queries";

export default async function AdminRecruitersPage() {
  const items = await listUsersByProfileType("hire");

  return (
    <AppPage>
      <AdminRecruitersHub initialItems={items} />
    </AppPage>
  );
}
