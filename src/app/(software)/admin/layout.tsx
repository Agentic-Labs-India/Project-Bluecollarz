import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/app/(software)/admin/admin-shell";
import { auth } from "@/lib/auth/auth";
import {
  getProfileHomePath,
  normalizeProfileType,
} from "@/lib/profile-types";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AdminAuthGate>{children}</AdminAuthGate>
    </Suspense>
  );
}

async function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id?: string; profileType?: string }
    | undefined;

  if (!user?.id) redirect("/");

  const profileType = normalizeProfileType(user.profileType);
  if (profileType !== "admin") {
    redirect(getProfileHomePath(profileType));
  }

  return <AdminShell>{children}</AdminShell>;
}
