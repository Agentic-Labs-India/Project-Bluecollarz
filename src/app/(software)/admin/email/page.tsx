import { AdminEmailInbox } from "@/components/admin/admin-email-inbox";
import { AppPage } from "@/components/layout/app-page";

export default function AdminEmailPage() {
  return (
    <AppPage className="max-w-6xl">
      <AdminEmailInbox />
    </AppPage>
  );
}
