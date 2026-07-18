"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AppRailNav } from "@/components/layout/app-rail-nav";
import { AppUserMenu } from "@/components/layout/app-user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/auth-client";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AppNavItem } from "@/lib/routes";

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
  const { data: session } = authClient.useSession();

  const loggedInUser = session?.user || {
    name: "Loading...",
    email: "Loading...",
    image: "",
  };

  // Mobile uses AppBottomNav only — never mount the rail or its sheet/avatar.
  if (isMobile) return null;

  return (
    <Sidebar
      collapsible="none"
      className="hidden h-svh shrink-0 border-sidebar-border border-e md:flex"
      {...props}
    >
      <SidebarHeader className="flex items-center justify-center px-2 py-5">
        <Link href={homeHref} className="flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Gulf Path"
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
        <AppUserMenu
          profileHref={profileHref}
          user={{
            name: loggedInUser.name,
            email: loggedInUser.email,
            avatar: loggedInUser.image || "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
