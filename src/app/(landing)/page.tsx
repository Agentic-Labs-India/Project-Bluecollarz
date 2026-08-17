import type { Metadata } from "next";
import { Suspense } from "react";
import { CandidateJourney } from "@/components/landing/candidate-journey";
import { DitherLoginButton } from "@/components/landing/dither-login-button";
import { HOME_IMAGES } from "@/components/landing/home-images";
import { ImageStreamHero } from "@/components/landing/image-stream-hero";
import { LandingFaqs } from "@/components/landing/landing-faqs";
import { LatestRolesCarousel } from "@/components/landing/latest-roles-carousel";
import { RoleCarouselSkeleton } from "@/components/landing/role-carousel-skeleton";
import Testimonials from "@/components/landing/testimonials";
import { TrustedBy } from "@/components/landing/trusted-by";

export const metadata: Metadata = {
  title: "Blucollarz — AI hiring for skilled workers & recruiters",
  description:
    "Blucollarz is an AI-native hiring platform for blue-collar and skilled workers. Build a profile, complete AI interviews, verify identity, and connect with recruiters hiring worldwide. Sign in with Google to create your account.",
};

const HERO_STREAM = HOME_IMAGES.map((src) => ({ src }));

export default function Page() {
  return (
    <>
      <ImageStreamHero
        images={HERO_STREAM}
        speed={32}
        cards={8}
        className="isolate min-h-[70svh] w-full bg-linear-to-b from-primary via-primary/50 to-canvas pt-[68px] pb-12 sm:pb-16 lg:min-h-svh"
      >
        <div className="relative z-10 mx-auto flex min-h-[calc(70svh-68px)] w-full max-w-4xl flex-col items-center px-6 pt-16 text-center sm:pt-20 lg:min-h-[calc(100svh-68px)] lg:pt-24">
          <div className="flex h-9 w-fit max-w-[calc(100%-0.5rem)] flex-row items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/8 px-3 py-0.5 text-[12px] font-medium text-white backdrop-blur-sm sm:h-[38px] sm:gap-4 sm:px-5 sm:text-[13px]">
            <p className="flex flex-row items-center gap-1.5">
              <span className="hidden font-normal text-white/70 sm:inline sm:pr-3">
                Trusted by
              </span>
              <span className="font-normal text-white/70 sm:hidden">
                Trusted
              </span>
              <span>
                <span className="tabular-nums">40</span>k+
              </span>
            </p>
            <div className="h-5 w-px bg-white/25 sm:h-6" />
            <p className="hidden flex-row items-center gap-1.5 sm:flex">
              <span className="font-normal text-white/70 sm:pr-3">
                Roles open
              </span>
              <span>
                <span className="tabular-nums">2</span>k+
              </span>
            </p>
            <div className="hidden h-6 w-px bg-white/25 sm:block" />
            <p className="flex flex-row items-center gap-1.5">
              <span className="font-normal text-white/70 sm:pr-3">
                Countries
              </span>
              <span>
                <span className="tabular-nums">8</span>+
              </span>
            </p>
          </div>

          <h1 className="font-serif mt-7 whitespace-nowrap text-[1.85rem] leading-none font-normal tracking-[-0.02em] text-white sm:mt-9 sm:text-5xl md:mt-10 md:text-6xl lg:text-[4.25rem]">
            Work Abroad with us
          </h1>

          <div className="mt-auto flex w-full flex-row items-center justify-center pt-10 pb-16 sm:pb-24 lg:pb-28">
            <DitherLoginButton seed="hero-get-started" className="px-8 py-2.5">
              Get Started
            </DitherLoginButton>
          </div>
        </div>
      </ImageStreamHero>

      <div className="mx-auto w-full max-w-7xl overflow-x-clip px-6 pt-4 pb-4 md:px-8 lg:px-14">
        <Suspense fallback={<RoleCarouselSkeleton />}>
          <LatestRolesCarousel />
        </Suspense>

        <CandidateJourney />

        <TrustedBy />

        <Testimonials />

        <LandingFaqs />
      </div>
    </>
  );
}
