"use client";

import Link from "next/link";
import { LoginButton } from "@/components/auth/login-button";
import type { ProfileType } from "@/lib/profile-types";

export type FooterLinkItem = {
  label: string;
  href?: string;
  profileType?: ProfileType;
};

export function FooterLinks({ links }: { links: FooterLinkItem[] }) {
  return (
    <>
      {links.map((link) =>
        link.profileType ? (
          <LoginButton
            key={link.label}
            profileType={link.profileType}
            className="text-[15px] text-muted-foreground text-left duration-100 hover:text-mute"
          >
            {link.label}
          </LoginButton>
        ) : (
          <Link
            key={link.label}
            className="text-[15px] text-muted-foreground duration-100 hover:text-mute"
            href={link.href ?? "#"}
          >
            {link.label}
          </Link>
        ),
      )}
    </>
  );
}
