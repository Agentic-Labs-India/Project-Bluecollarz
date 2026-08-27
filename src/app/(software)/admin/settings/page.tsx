import { AdminSettingsHub } from "@/components/admin/admin-settings-hub";
import { AppPage } from "@/components/layout/app-page";
import { getPlatformSettings } from "@/lib/admin/platform-settings";
import { defaultPlatformSettings } from "@/lib/admin/platform-settings-defaults";
import { listUsersByProfileType } from "@/lib/admin/queries";

export default async function AdminSettingsPage() {
  const [items, settings, defaults] = await Promise.all([
    listUsersByProfileType("admin"),
    getPlatformSettings(),
    Promise.resolve(defaultPlatformSettings()),
  ]);

  return (
    <AppPage>
      <AdminSettingsHub
        initialItems={items}
        initialSettings={settings}
        initialDefaults={defaults}
      />
    </AppPage>
  );
}
