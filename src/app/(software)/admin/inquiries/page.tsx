import { AdminRecruiterInquiries } from "@/components/admin/admin-recruiter-inquiries";
import { AppPage } from "@/components/layout/app-page";

export default function AdminInquiriesPage() {
  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Inquiries
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Recruiter access requests from the for-recruiters form. Approve to
          provision hire access; reject keeps the record.
        </p>
      </div>
      <AdminRecruiterInquiries />
    </AppPage>
  );
}
