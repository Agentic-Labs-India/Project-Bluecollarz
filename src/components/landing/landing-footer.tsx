"use client";

import Image from "next/image";
import Link from "next/link";
import { LoginButton } from "@/components/auth/login-button";
import { PrimaryDither } from "@/components/landing/primary-dither";

type FooterLink = {
  label: string;
  href?: string;
  login?: boolean;
};

const FOOTER_SECTIONS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Mission", href: "/mission" },
      { label: "Vision", href: "/vision" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Programs",
    links: [
      { label: "For Recruiters", href: "/for-recruiters" },
      { label: "Find work", login: true },
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

/** Full-bleed primary footer with dither wash. */
export function LandingFooter() {
  return (
    <footer
      id="footer"
      className="relative mt-16 w-full overflow-hidden bg-canvas"
    >
      <div className="relative z-10 min-h-[380px] overflow-hidden bg-[color-mix(in_oklab,var(--primary)_38%,#030712)]">
        <PrimaryDither seed="landing-footer" opacity={0.7} wash={false} />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-between gap-16 px-6 py-16 md:px-12 md:py-24 lg:flex-row lg:gap-8 lg:px-24">
          <div className="flex w-full max-w-sm flex-col justify-between">
            <div className="flex flex-col">
              <Link
                href="/"
                className="mb-3 inline-flex items-center gap-2.5 text-white"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                  <Image
                    src="/logo.svg"
                    alt=""
                    width={36}
                    height={36}
                    className="size-full"
                  />
                </span>
                <span className="text-xl font-semibold tracking-tight md:text-[22px]">
                  Blucollarz
                </span>
              </Link>
              <h3 className="text-base leading-7 text-white md:text-[17px] md:leading-7">
                AI hiring for skilled
                <br />
                workers heading abroad
              </h3>
            </div>

            <div className="mt-12 flex flex-col gap-2 pt-8 lg:mt-auto">
              <p className="text-xs text-white/75 md:text-[13px]">
                © 2026 Blucollarz. All rights reserved.
              </p>
              <p className="text-xs text-white/75 md:text-[13px]">
                Hyderabad, India
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-12 md:gap-24 lg:flex-nowrap">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-5">
                <h3 className="text-base font-semibold text-white md:text-lg">
                  {section.title}
                </h3>
                <ul className="flex flex-col gap-3 md:gap-4">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.login ? (
                        <LoginButton className="text-sm text-white/75 transition-colors hover:text-white md:text-[15px]">
                          {link.label}
                        </LoginButton>
                      ) : (
                        <Link
                          href={link.href ?? "#"}
                          className="text-sm text-white/75 transition-colors hover:text-white md:text-[15px]"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
