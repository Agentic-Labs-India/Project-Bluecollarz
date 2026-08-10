"use client";

import { useEffect, useState } from "react";
import { LoginButton } from "@/components/auth/login-button";
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
    title: "Get onboarded with AI and find the right role for you",
    body: "Voice onboarding builds your profile and matches verified roles to your trade.",
  },
  {
    code: "02",
    title: "Send your application",
    body: "Apply once with a complete profile — no repetitive forms or paperwork.",
  },
  {
    code: "03",
    title: "Clear AI interviews",
    body: "Show communication and domain skills in structured, fair interviews.",
  },
  {
    code: "04",
    title: "Get selected & verified",
    body: "The recruiter selects you and DigiLocker confirms your identity.",
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

const PRIMARY_TEXTURE = {
  colorBack: "#233eff",
  colorFront: "#a8b4ff",
  shape: "warp" as const,
  type: "random" as const,
  size: 0.55,
  scale: 1.65,
  rotation: 18,
  offsetX: 0.05,
  offsetY: -0.08,
  speed: 0.35,
};

const PRIMARY_LAYOUT = {
  ...TICKET_LAYOUT,
  inkColor: "#ffffff",
  watermarkColor: "#d4daff",
  watermarkOpacity: 0.55,
  stubOpacity: 0.92,
};

function ticketWidth() {
  if (typeof window === "undefined") return 640;
  return Math.min(720, Math.max(300, window.innerWidth - 64));
}

export function CandidateJourney() {
  const [width, setWidth] = useState(640);

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
          <p className="text-mute text-[11px] font-medium tracking-[0.14em] uppercase sm:text-xs">
            Your journey
          </p>
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
                className="border-border bg-card flex items-center gap-3 border px-3.5 py-3 sm:gap-4 sm:px-4 sm:py-3.5"
              >
                <span
                  aria-hidden
                  className="font-heading shrink-0 text-[2.75rem] leading-none font-semibold tracking-tighter text-transparent sm:text-[3.25rem] [-webkit-text-stroke:1.4px_color-mix(in_oklab,var(--foreground)_28%,transparent)]"
                >
                  {number}
                </span>
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
              Your Visa Ticket to Abroad!!!
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Tap the pass to sign in and start your journey.
            </p>
          </div>

          <LoginButton className="group cursor-pointer rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:outline-none disabled:opacity-70">
            <span className="sr-only">
              Your Visa Ticket to Abroad — start now and sign in
            </span>
            <span className="block transition-transform duration-300 group-hover:-translate-y-0.5 group-active:translate-y-0">
              <AdmitOneTicket
                name="Your Visa Ticket to Abroad"
                presenter="Blucollarz"
                event="Ready to fly"
                venue="Work abroad"
                dates="Start now"
                stubText="Go"
                watermark="GO"
                width={width}
                geometry={TICKET_GEOMETRY}
                layout={PRIMARY_LAYOUT}
                texture={PRIMARY_TEXTURE}
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
