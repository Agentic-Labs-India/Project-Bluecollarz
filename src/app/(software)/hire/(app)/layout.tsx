import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/layout/page-skeleton";
import { auth } from "@/lib/auth/auth";
import { isHireCompanyVerified } from "@/lib/hire/onboarding";

/** Locked hire surface — company onboarding, then the rest. */
export default function HireAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <HireAppGate>{children}</HireAppGate>
    </Suspense>
  );
}

async function HireAppGate({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string } | undefined;

  if (!user?.id) redirect("/");
  if (!(await isHireCompanyVerified(user.id))) {
    redirect("/hire/onboarding");
  }

  return children;
}
