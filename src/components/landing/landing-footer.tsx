"use client";

import Link from "next/link";
import { LoginButton } from "@/components/auth/login-button";
import type { ProfileType } from "@/lib/profile-types";

type FooterLink = {
  label: string;
  href?: string;
  profileType?: ProfileType;
};

const FOOTER_SECTIONS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Mission", href: "/mission" },
      { label: "Vision", href: "/vision" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Programs",
    links: [
      { label: "For Recruiters", href: "/for-recruiters" },
      { label: "Find work", profileType: "work" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

/** Full landing footer shared across all public marketing pages. */
export function LandingFooter() {
  return (
    <div
      className="mt-16 w-full border-t border-canvas-soft bg-canvas px-0 pb-[clamp(2.5rem,4vw,3rem)] pt-[clamp(2.5rem,4vw,4rem)] font-sans antialiased md:px-0 lg:px-0"
      id="footer"
    >
      <div className="mx-auto max-w-none">
        <div className="grid grid-cols-2 gap-6 text-foreground md:grid-cols-3 md:gap-4">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="mb-2 mt-0.5 text-[15px] font-medium">
                {section.title}
              </div>
              <div className="flex flex-col gap-1">
                {section.links.map((link) =>
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
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-row items-center gap-3">
            <span className="text-sm text-mute">© 2026 BlueCollarz</span>
            <div className="flex flex-row items-center">
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                version="1.2"
                baseProfile="tiny"
                viewBox="0 0 24 24"
                className="size-4 text-mute"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10.368 19.102c.349 1.049 1.011 1.086 1.478.086l5.309-11.375c.467-1.002.034-1.434-.967-.967l-11.376 5.308c-1.001.467-.963 1.129.085 1.479l4.103 1.367 1.368 4.102z" />
              </svg>
              <span className="text-sm text-mute">Dubai, UAE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
