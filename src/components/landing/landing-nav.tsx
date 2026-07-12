"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LoginButton } from "@/components/auth/login-button";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Mission", href: "/mission" },
  { label: "Vision", href: "/vision" },
  { label: "For RAs", href: "/for-ra" },
  { label: "For Recruiters", href: "/for-recruiters" },
  { label: "Contact", href: "/contact" },
];

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div
        id="TopNav"
        className="fixed top-0 left-0 z-888 flex h-[68px] w-full flex-row items-center justify-between gap-4 bg-canvas px-6 text-[14px] duration-300 sm:px-6 md:px-5"
      >
        <Link className="relative z-10 w-[100px] shrink-0" href="/">
          <Image
            src="/logo.svg"
            alt="Gulf Path logo"
            width={34}
            height={34}
            className="h-[30px] w-[30px] sm:h-[34px] sm:w-[34px]"
            priority
          />
        </Link>

        <nav
          aria-label="Main"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-row items-center gap-2 lg:flex"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              className="rounded-md px-3.5 py-2 duration-200 hover:bg-muted"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative z-10 flex w-[100px] flex-row items-center justify-end gap-2">
          <LoginButton
            profileType="work"
            className="hidden min-w-[72px] rounded-md bg-muted/80 px-6 py-2 duration-300 hover:bg-secondary/80 lg:block"
          />
          <button
            type="button"
            className="text-mute duration-200 hover:text-muted-foreground lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 512 512"
              className="h-6 w-6"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              {mobileOpen ? (
                <path
                  fill="none"
                  strokeLinecap="round"
                  strokeMiterlimit="10"
                  strokeWidth="48"
                  d="M368 368 144 144M368 144 144 368"
                />
              ) : (
                <path
                  fill="none"
                  strokeLinecap="round"
                  strokeMiterlimit="10"
                  strokeWidth="48"
                  d="M88 152h336M88 256h336M88 360h336"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`fixed top-[68px] bottom-0 left-0 z-[1000] w-screen bg-canvas px-[18px] pr-6 duration-300 lg:hidden ${mobileOpen ? "ml-0 opacity-100" : "pointer-events-none -ml-[100vw] opacity-0"}`}
      >
        <div className="flex h-full w-full flex-col text-[14px]">
          <div className="flex flex-1 flex-col items-start justify-start max-lg:pt-4 lg:gap-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                className="w-full rounded-md px-2 py-2 text-start duration-200 hover:bg-muted/80 max-lg:py-3 max-lg:text-base"
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <LoginButton
              profileType="work"
              className="mt-4 w-full rounded-md bg-muted/80 px-6 py-2 text-center duration-300 hover:bg-secondary/80"
              onBeforeOpen={() => setMobileOpen(false)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
