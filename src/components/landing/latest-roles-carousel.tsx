import { RoleCarousel } from "@/components/landing/role-carousel";
import { getLatestPublishedRoles } from "@/lib/jobs/queries";

export async function LatestRolesCarousel() {
  const roles = await getLatestPublishedRoles(10);
  return <RoleCarousel roles={roles} />;
}
