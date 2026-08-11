import { AdminJobVerification } from "@/components/admin/admin-job-verification";
import { AppPage } from "@/components/layout/app-page";

export default function AdminJobsVerificationPage() {
  return (
    <AppPage>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Jobs Verification
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Review recruiter job posts awaiting approval. Approve to publish live;
          deny returns the role to draft and emails the recruiter.
        </p>
      </div>
      <AdminJobVerification />
    </AppPage>
  );
}
