import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HireShell } from "@/app/(software)/hire/hire-shell";
import { auth } from "@/lib/auth/auth";
import {
  getProfileHomePath,
  normalizeProfileType,
} from "@/lib/user/profile-types";

/**
 * Hire area: only `hire` profiles. Others are sent to their home.
 * Onboarding lives outside `(app)/layout.tsx` so it stays reachable
 * while the rest of the hire app is locked.
 */
export default function HireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <HireAuthGate>{children}</HireAuthGate>
    </Suspense>
  );
}

async function HireAuthGate({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id?: string; profileType?: string }
    | undefined;

  if (!user?.id) redirect("/");

  const profileType = normalizeProfileType(user.profileType);
  if (profileType !== "hire") {
    redirect(getProfileHomePath(profileType));
  }

  return <HireShell>{children}</HireShell>;
}
