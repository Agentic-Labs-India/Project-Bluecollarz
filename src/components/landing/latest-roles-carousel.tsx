import { getLatestPublishedRoles } from "@/lib/jobs/queries";
import { RoleCarousel } from "@/components/landing/role-carousel";

export async function LatestRolesCarousel() {
  const roles = await getLatestPublishedRoles(10);
  return <RoleCarousel roles={roles} />;
}
