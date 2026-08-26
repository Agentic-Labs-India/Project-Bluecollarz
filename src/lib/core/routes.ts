import {
  Briefcase,
  FileText,
  Home,
  LifeBuoy,
  type LucideIcon,
  Mail,
  Scale,
  Search,
  Settings,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

export interface AppNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const CANDIDATE_NAV: AppNavItem[] = [
  { title: "Explore", url: "/candidate/explore", icon: Search },
  { title: "Home", url: "/candidate/home", icon: Home },
  { title: "Profile", url: "/candidate/profile", icon: User },
  { title: "Settings", url: "/candidate/settings", icon: Settings },
];

export const HIRE_NAV: AppNavItem[] = [
  { title: "Profile", url: "/hire/profile", icon: User },
  { title: "Roles", url: "/hire/roles", icon: Briefcase },
  { title: "Settings", url: "/hire/settings", icon: Settings },
];

export const ADMIN_NAV: AppNavItem[] = [
  { title: "Recruiters", url: "/admin/recruiters", icon: Users },
  { title: "Medical Test", url: "/admin/medical", icon: Stethoscope },
  { title: "Compliance", url: "/admin/compliance", icon: Scale },
  { title: "Email", url: "/admin/email", icon: Mail },
  { title: "Support", url: "/admin/support", icon: LifeBuoy },
  { title: "Blog", url: "/admin/blog", icon: FileText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

/** Base path for each profile area; everything under these requires auth. */
export const PROFILE_BASE_ROUTES = ["/candidate", "/hire", "/admin"] as const;
