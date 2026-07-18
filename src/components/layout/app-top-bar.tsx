"use client";

import Image from "next/image";
import Link from "next/link";
import { AppUserMenuButton } from "@/components/layout/app-user-menu";
import { authClient } from "@/lib/auth/auth-client";

/** Mobile-only top bar: logo left, account avatar right, bottom separator. */
export function AppTopBar({
  homeHref,
  profileHref,
}: {
  homeHref: string;
  profileHref: string;
}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <header className="bg-background border-border/60 fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-3 border-b px-4 md:hidden">
      <Link href={homeHref} className="flex items-center" aria-label="Home">
        <Image
          src="/logo.svg"
          alt="BlueCollarz"
          width={32}
          height={32}
          className="size-8"
          priority
        />
      </Link>

      <AppUserMenuButton
        profileHref={profileHref}
        user={{
          name: user?.name || "Account",
          email: user?.email || "",
          avatar: user?.image || "",
        }}
      />
    </header>
  );
}
