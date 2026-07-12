import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HireJobsTable } from "@/components/hire/jobs-table";
import { auth } from "@/lib/auth/auth";
import { getHireProfileComplete } from "@/lib/hire/queries";

export default async function HireRolesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) redirect("/");

  const profileComplete = await getHireProfileComplete(user.id);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Your roles
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Create, publish, and manage job postings. Published roles appear in
          the candidate explore feed.
        </p>
      </div>
      <HireJobsTable profileComplete={profileComplete} />
    </div>
  );
}
