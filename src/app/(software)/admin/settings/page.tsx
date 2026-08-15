import { AdminSettingsHub } from "@/components/admin/admin-settings-hub";
import { AppPage } from "@/components/layout/app-page";
import { listUsersByProfileType } from "@/lib/admin/queries";

export default async function AdminSettingsPage() {
  const items = await listUsersByProfileType("admin");

  return (
    <AppPage>
      <AdminSettingsHub initialItems={items} />
    </AppPage>
  );
}
