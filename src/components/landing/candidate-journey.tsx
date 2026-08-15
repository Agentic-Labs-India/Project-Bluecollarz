"use client";

import { useEffect, useRef, useState } from "react";
import { LoginButton } from "@/components/auth/login-button";
import {
  PRIMARY_DITHER,
  PRIMARY_TICKET_TEXTURE,
  PrimaryDither,
  useRecoverWebGlCanvas,
} from "@/components/landing/primary-dither";
import AdmitOneTicket, {
  TICKET_GEOMETRY,
  TICKET_LAYOUT,
} from "@/components/landing/ticket";

type JourneyStep = {
  code: string;
  title: string;
  body: string;
};

const STEPS: JourneyStep[] = [
  {
    code: "01",
    title: "Get onboarded with AI",
    body: "Voice onboarding collects currently working as, years of experience, education, work experience, and languages.",
  },
  {
    code: "02",
    title: "Verify with DigiLocker",
    body: "Identity comes from DigiLocker: name, date of birth, phone, location, gender, PAN, and Aadhaar.",
  },
  {
    code: "03",
    title: "Send your application",
    body: "Apply once with a complete profile — no repetitive forms or paperwork.",
  },
  {
    code: "04",
    title: "Clear AI interviews",
    body: "Show communication and domain skills in structured, fair interviews.",
  },
  {
    code: "05",
    title: "Get medically approved",
    body: "Complete medical clearance through our approved lab network.",
  },
  {
    code: "06",
    title: "Get your visa approved",
    body: "Your verified profile and documents move into visa processing.",
  },
];

const PRIMARY_LAYOUT = {
  ...TICKET_LAYOUT,
  inkColor: "#ffffff",
  watermarkColor: PRIMARY_DITHER.watermark,
  watermarkOpacity: 0.35,
  stubOpacity: 0.92,
};

function ticketWidth() {
  if (typeof window === "undefined") return 640;
  return Math.min(720, Math.max(300, window.innerWidth - 64));
}

function JourneyStepNumber({ value }: { value: string }) {
  const mask = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 96"><text x="36" y="82" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="92" font-weight="700" letter-spacing="-0.08em">${value}</text></svg>`,
  )}")`;

  return (
    <span
      aria-hidden
      className="relative block h-20 w-14 shrink-0 sm:h-24 sm:w-16 md:h-28 md:w-[4.5rem]"
      style={{
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    >
      <span className="bg-primary absolute inset-0">
        <PrimaryDither
          seed={`journey-step-${value}`}
          opacity={0.95}
          wash={false}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        />
      </span>
    </span>
  );
}

export function CandidateJourney() {
  const [width, setWidth] = useState(640);
  const ticketRef = useRef<HTMLSpanElement>(null);
  const ticketNonce = useRecoverWebGlCanvas(ticketRef);

  useEffect(() => {
    const update = () => setWidth(ticketWidth());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section
      aria-labelledby="candidate-journey-heading"
      className="relative mt-16 py-10 sm:mt-20 sm:py-14 md:mt-24"
    >
      <div className="w-full">
        <div className="max-w-2xl">
          <h2
            id="candidate-journey-heading"
            className="font-heading text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
          >
            From first sign-in to work abroad
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed sm:text-[15px]">
            Six clear steps — then claim your visa ticket and take off.
          </p>
        </div>

        <ul className="mt-8 grid gap-2 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => {
            const number = String(index + 1);
            return (
              <li
                key={step.code}
                className="border-border bg-card flex items-center gap-4 border px-4 py-4 sm:gap-5 sm:px-5 sm:py-5"
              >
                <JourneyStepNumber value={number} />
                <div className="min-w-0">
                  <p className="text-foreground text-sm leading-snug font-semibold">
                    <span className="sr-only">Step {number}. </span>
                    {step.title}
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed sm:text-[13px]">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-border bg-card mt-2 flex min-h-64 flex-col items-center justify-center gap-6 border px-4 py-10 sm:min-h-72 sm:px-8 sm:py-14 lg:min-h-80">
          <div className="max-w-lg text-center">
            <p className="text-mute text-[11px] font-medium tracking-[0.14em] uppercase sm:text-xs">
              Finale
            </p>
            <p className="font-heading text-foreground mt-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              Your Ticket to Abroad!!!
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Tap the pass to sign in and start your journey.
            </p>
          </div>

          <LoginButton className="group cursor-pointer rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:outline-none disabled:opacity-70">
            <span className="sr-only">
              Your Ticket to Abroad — start now and sign in
            </span>
            <span
              ref={ticketRef}
              className="block transition-transform duration-300 group-hover:-translate-y-0.5 group-active:translate-y-0"
            >
              <AdmitOneTicket
                key={ticketNonce}
                name="Your Ticket is Ready"
                presenter="Blucollarz"
                event="Start For Free"
                venue="Work abroad"
                dates="Start now"
                stubText="Go"
                watermark="LET'S"
                width={width}
                geometry={TICKET_GEOMETRY}
                layout={PRIMARY_LAYOUT}
                texture={PRIMARY_TICKET_TEXTURE}
                className="font-heading shadow-[0_18px_50px_-28px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
                tilt={{ maxTilt: 7, scale: 1.015, glare: 0.14 }}
              />
            </span>
          </LoginButton>
        </div>
      </div>
    </section>
  );
}
