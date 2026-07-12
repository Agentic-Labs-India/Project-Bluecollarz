import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getHireProfileComplete } from "@/lib/hire/queries";
import { NewRoleClient } from "./new-role-client";

export default async function NewRolePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) redirect("/");

  const complete = await getHireProfileComplete(user.id);
  if (!complete) {
    redirect("/hire/profile?complete=required");
  }

  return <NewRoleClient />;
}
