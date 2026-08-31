import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requirePageProfile } from "@/lib/auth/session";
import { isHireCompanyVerified } from "@/lib/hire/onboarding";

/** Locked hire surface — company onboarding, then the rest. */
export default function HireAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <HireAppGate>{children}</HireAppGate>
    </Suspense>
  );
}

async function HireAppGate({ children }: { children: React.ReactNode }) {
  const user = await requirePageProfile("hire");
  if (!(await isHireCompanyVerified(user.id))) {
    redirect("/hire/onboarding");
  }
  return children;
}
