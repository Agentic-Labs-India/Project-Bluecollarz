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
import { cn } from "@/lib/utils";

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

const PLACEMENT = [
  "md:col-start-1 md:row-start-1",
  "md:col-start-1 md:row-start-2",
  "md:col-start-1 md:row-start-3",
  "md:col-start-1 md:row-start-4",
  "md:col-start-2 md:row-start-1",
  "md:col-start-2 md:row-start-2 md:row-span-3",
] as const;

const PRIMARY_LAYOUT = {
  ...TICKET_LAYOUT,
  inkColor: "#ffffff",
  watermarkColor: PRIMARY_DITHER.watermark,
  watermarkOpacity: 0.35,
  stubOpacity: 0.92,
};

function JourneyStepNumber({ value }: { value: string }) {
  const mask = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 96"><text x="36" y="82" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="92" font-weight="700" letter-spacing="-0.08em">${value}</text></svg>`,
  )}")`;

  return (
    <span
      aria-hidden
      className="relative block h-11 w-8 shrink-0 sm:h-12 sm:w-9"
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

function VisaTicket() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLSpanElement>(null);
  const ticketNonce = useRecoverWebGlCanvas(ticketRef);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.min(520, Math.max(240, el.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="mt-auto flex w-full flex-1 items-center justify-center pt-4"
    >
      <LoginButton className="group w-full cursor-pointer rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:outline-none disabled:opacity-70">
        <span className="sr-only">Visa approved — start now and sign in</span>
        <span
          ref={ticketRef}
          className="block w-full transition-transform duration-300 group-hover:-translate-y-0.5 group-active:translate-y-0"
        >
          <AdmitOneTicket
            key={ticketNonce}
            name="Visa Approved"
            presenter="Blucollarz"
            event="Work abroad"
            venue="Take off"
            dates="Start now"
            stubText="Go"
            watermark="VISA"
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
  );
}

export function CandidateJourney() {
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

        <ol className="mt-8 grid grid-cols-1 gap-2 sm:mt-10 md:grid-cols-2 md:grid-rows-4">
          {STEPS.map((step, index) => {
            const number = String(index + 1);
            const isFinale = index === STEPS.length - 1;
            return (
              <li
                key={step.code}
                className={cn(
                  "border-border bg-card flex h-full gap-3 border px-3 py-3 sm:gap-4 sm:px-4",
                  isFinale ? "flex-col md:min-h-0" : "items-center",
                  PLACEMENT[index],
                )}
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <JourneyStepNumber value={number} />
                  <div className="min-w-0">
                    <h3 className="font-heading text-foreground text-sm font-semibold tracking-tight sm:text-base">
                      <span className="sr-only">Step {number}. </span>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed sm:text-[13px]">
                      {step.body}
                    </p>
                  </div>
                </div>
                {isFinale ? <VisaTicket /> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
