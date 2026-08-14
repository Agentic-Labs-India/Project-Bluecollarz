import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CandidateJourney } from "@/components/landing/candidate-journey";
import { DitherLoginButton } from "@/components/landing/dither-login-button";
import { HOME_IMAGES } from "@/components/landing/home-images";
import { LandingFaqs } from "@/components/landing/landing-faqs";
import { LatestRolesCarousel } from "@/components/landing/latest-roles-carousel";
import { RoleCarouselSkeleton } from "@/components/landing/role-carousel-skeleton";
import Testimonials from "@/components/landing/testimonials";
import { PrimaryDitherBand } from "@/components/landing/primary-dither";
import { TrustedBy } from "@/components/landing/trusted-by";
import { WorldMapLazy } from "@/components/ui/world-map-lazy";

export const metadata: Metadata = {
  title: "Blucollarz — AI hiring for skilled workers & recruiters",
  description:
    "Blucollarz is an AI-native hiring platform for blue-collar and skilled workers. Build a profile, complete AI interviews, verify identity, and connect with recruiters hiring worldwide. Sign in with Google to create your account.",
};

/** Origins across India → global destinations (equirectangular lat/lng). */
const HERO_MAP_ROUTES = [
  {
    start: { lat: 28.6139, lng: 77.209, label: "Delhi" },
    end: {
      lat: 25.2048,
      lng: 55.2708,
      label: "Dubai",
      image: HOME_IMAGES[0],
    },
  },
  {
    start: { lat: 31.634, lng: 74.8723, label: "Punjab" }, // Amritsar
    end: {
      lat: 40.7128,
      lng: -74.006,
      label: "USA",
      image: HOME_IMAGES[1],
    },
  },
  {
    start: { lat: 12.9716, lng: 77.5946, label: "Bangalore" },
    end: {
      lat: 37.5665,
      lng: 126.978,
      label: "Korea",
      image: HOME_IMAGES[2],
    },
  },
  {
    start: { lat: 13.0827, lng: 80.2707, label: "Tamil Nadu" }, // Chennai
    end: {
      lat: 1.3521,
      lng: 103.8198,
      label: "Singapore",
      image: HOME_IMAGES[3],
    },
  },
  {
    start: { lat: 25.5941, lng: 85.1376, label: "Bihar" }, // Patna
    end: {
      lat: -23.5505,
      lng: -46.6333,
      label: "South America",
      image: HOME_IMAGES[4],
    },
  },
  {
    start: { lat: 26.9124, lng: 75.7873, label: "Rajasthan" }, // Jaipur
    end: {
      lat: 51.5074,
      lng: -0.1278,
      label: "UK",
      image: HOME_IMAGES[5],
    },
  },
];

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip px-6 py-4 duration-300 md:px-8 lg:px-14 2xl:mt-16">
      <div className="relative mt-16 w-full overflow-hidden text-center sm:mt-20 md:mt-24">
        <div className="relative z-10 flex flex-col items-center pt-4">
          <section className="relative mx-auto mt-4 flex h-9 w-fit max-w-[calc(100%-0.5rem)] flex-row items-center justify-center gap-1 overflow-hidden rounded-full border border-primary/25 px-3 py-0.5 text-[12px] font-medium shadow-sm sm:mt-6 sm:h-[38px] sm:px-5 sm:text-[12.75px] md:mt-8">
            <PrimaryDitherBand
              seed="hero-stats"
              className="bg-primary pointer-events-none absolute inset-0 h-full w-full overflow-hidden rounded-full"
            />
            <div className="relative z-10 flex w-fit flex-row items-center justify-center gap-2.5 text-white sm:gap-4">
              <p className="flex flex-row items-center gap-1.5 text-[12px] font-medium sm:text-[14px]">
                <span className="hidden font-normal text-white/80 sm:inline sm:translate-y-[-0.5px] sm:pr-4">
                  Trusted by
                </span>
                <span className="font-normal text-white/80 sm:hidden">
                  Trusted
                </span>
                <span className="sm:translate-y-[-0.5px]">
                  <span className="tabular-nums">40</span>k+
                </span>
              </p>
              <div className="h-6 w-px bg-white/30 sm:h-9" />
              <p className="hidden flex-row items-center gap-1.5 text-[14px] font-medium sm:flex">
                <span className="font-normal text-white/80 sm:translate-y-[-0.5px] sm:pr-4">
                  Roles open
                </span>
                <span className="sm:translate-y-[-0.5px]">
                  <span className="tabular-nums">2</span>k+
                </span>
              </p>
              <div className="hidden h-9 w-px bg-white/30 sm:block" />
              <p className="flex flex-row items-center gap-1.5 text-[12px] font-medium sm:text-[14px]">
                <span className="font-normal text-white/80 sm:translate-y-[-0.5px] sm:pr-4">
                  Countries
                </span>
                <span className="sm:translate-y-[-0.5px]">
                  <span className="tabular-nums">8</span>+
                </span>
              </p>
            </div>
          </section>

          <h1 className="mt-5 text-[30px] leading-[1.15] font-normal sm:mt-7 sm:text-[42px] sm:leading-[1.1] md:mt-8 md:text-5xl md:leading-[1.1]">
            Work Abroad with us!
          </h1>
          <p className="text-foreground mx-auto mt-3 max-w-[22rem] px-1 text-sm leading-relaxed sm:mt-6 sm:max-w-[400px] sm:text-base">
            We help you find the jobs in USA, Canada, Australia, UK, Dubai,
            Europe, and more.
          </p>
          <div className="mt-5 flex w-full flex-row items-center justify-center gap-3 text-[15px] sm:mt-6">
            <DitherLoginButton seed="hero-get-started">
              Get Started
            </DitherLoginButton>
            <Link
              className="bg-muted hover:bg-secondary flex flex-row items-center gap-1.5 rounded-md px-6 py-[9.5px] text-sm duration-200"
              href="/about"
            >
              About us
            </Link>
          </div>
        </div>

        {/* Map under the copy — compact on mobile so hero stays readable */}
        <div className="pointer-events-none relative z-0 mt-3 w-[118%] max-w-none -translate-x-[7.5%] sm:-mt-10 sm:w-[110%] sm:-translate-x-[4.5%] md:-mt-12 md:w-[120%] md:-translate-x-[8%]">
          <WorldMapLazy
            dots={HERO_MAP_ROUTES}
            lineColor="var(--primary)"
            showLabels
            animationDuration={5.5}
            loop
            compact
            focus={{ lat: 22.5, lng: 79, scale: 1.55 }}
            className="mx-auto max-h-[170px] opacity-70 sm:max-h-[340px] sm:opacity-80 md:max-h-[400px] lg:max-h-[460px]"
          />
        </div>
      </div>

      <Suspense fallback={<RoleCarouselSkeleton />}>
        <LatestRolesCarousel />
      </Suspense>

      <CandidateJourney />

      <TrustedBy />

      <Testimonials />

      <LandingFaqs />
    </div>
  );
}
