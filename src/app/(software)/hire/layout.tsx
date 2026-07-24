import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HireShell } from "@/app/(software)/hire/hire-shell";
import { auth } from "@/lib/auth/auth";
import {
  getProfileHomePath,
  normalizeProfileType,
} from "@/lib/profile-types";

/** Hire area: only `hire` profiles. Others are sent to their home. */
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
