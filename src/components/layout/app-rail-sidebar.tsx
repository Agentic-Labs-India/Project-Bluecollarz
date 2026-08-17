"use client";

import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import { AppRailNav } from "@/components/layout/app-rail-nav";
import { AppUserMenu } from "@/components/layout/app-user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth/auth-client";
import type { AppNavItem } from "@/lib/core/routes";

export function AppRailSidebar({
  items,
  homeHref,
  profileHref,
  ...props
}: {
  items: AppNavItem[];
  homeHref: string;
  profileHref: string;
} & React.ComponentProps<typeof Sidebar>) {
  const isMobile = useIsMobile();
  const { data: session, isPending } = authClient.useSession();

  const loggedInUser = session?.user;

  // Mobile uses AppBottomNav only — never mount the rail or its sheet/avatar.
  if (isMobile) return null;

  return (
    <Sidebar
      collapsible="none"
      className="border-sidebar-border border-e"
      {...props}
    >
      <SidebarHeader className="flex items-center justify-center px-2 py-5">
        <Link href={homeHref} className="flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Blucollarz"
            width={32}
            height={32}
            className="size-8"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col justify-between overflow-visible">
        <AppRailNav items={items} />
      </SidebarContent>

      <SidebarFooter className="border-0 p-0">
        {isPending || !loggedInUser ? (
          <div className="flex justify-center p-2">
            <Skeleton className="size-8 rounded-full" />
          </div>
        ) : (
          <AppUserMenu
            profileHref={profileHref}
            user={{
              name: loggedInUser.name || "",
              email: loggedInUser.email || "",
              avatar: loggedInUser.image || "",
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
