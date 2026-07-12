import {
  Briefcase,
  Home,
  LucideIcon,
  Search,
  Settings,
  User,
} from "lucide-react";

export const ADMIN_EMAIL = "realnikhileshrana@gmail.com";

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

/** Base path for each profile area; everything under these requires auth. */
export const PROFILE_BASE_ROUTES = ["/candidate", "/hire", "/agents"] as const;
