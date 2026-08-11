"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HardHatIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HOME_IMAGES } from "@/components/landing/home-images";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { cn } from "@/lib/utils";

type WorkerStory = {
  id: string;
  name: string;
  trade: string;
  destination: string;
  quote: string;
  image: string;
};

const WORKER_STORIES: WorkerStory[] = [
  {
    id: "asha",
    name: "Asha",
    trade: "Facilities electrician",
    destination: "Dubai, UAE",
    quote:
      "My experience finally became more than a line on a CV. I could show what I know and apply with confidence.",
    image: HOME_IMAGES[0],
  },
  {
    id: "ravi",
    name: "Ravi",
    trade: "Structural welder",
    destination: "Doha, Qatar",
    quote:
      "The interview focused on the work I actually do. That gave me a fair chance to prove my trade.",
    image: HOME_IMAGES[1],
  },
  {
    id: "omar",
    name: "Omar",
    trade: "Heavy vehicle driver",
    destination: "Abu Dhabi, UAE",
    quote:
      "Everything was clear—from the role and pay to the next stage. I always knew what I needed to complete.",
    image: HOME_IMAGES[2],
  },
  {
    id: "priya",
    name: "Priya",
    trade: "Warehouse operator",
    destination: "Singapore",
    quote:
      "I built my profile once and used it through the whole journey. There was no repeated paperwork.",
    image: HOME_IMAGES[3],
  },
  {
    id: "luis",
    name: "Luis",
    trade: "Field service technician",
    destination: "Riyadh, Saudi Arabia",
    quote:
      "The domain interview let me explain how I solve problems on site, not just what was written on my resume.",
    image: HOME_IMAGES[4],
  },
  {
    id: "meena",
    name: "Meena",
    trade: "Hospitality supervisor",
    destination: "Dubai, UAE",
    quote:
      "I could complete the process step by step on my phone and understand exactly where my application stood.",
    image: HOME_IMAGES[5],
  },
  {
    id: "arjun",
    name: "Arjun",
    trade: "HVAC technician",
    destination: "Muscat, Oman",
    quote:
      "My skills were assessed directly. That mattered more than having the perfect English resume.",
    image: HOME_IMAGES[6],
  },
  {
    id: "joseph",
    name: "Joseph",
    trade: "Industrial plumber",
    destination: "Manama, Bahrain",
    quote:
      "The journey felt organised and professional. Every completed step moved me closer to the opportunity.",
    image: HOME_IMAGES[0],
  },
  {
    id: "sanjay",
    name: "Sanjay",
    trade: "CNC machine operator",
    destination: "Hamburg, Germany",
    quote:
      "Recruiters could see my experience, interview answers, and verified identity in one complete profile.",
    image: HOME_IMAGES[1],
  },
  {
    id: "farah",
    name: "Farah",
    trade: "Care assistant",
    destination: "Manchester, UK",
    quote:
      "I did not have to guess what came next. The platform made a complicated overseas process feel manageable.",
    image: HOME_IMAGES[2],
  },
  {
    id: "deepak",
    name: "Deepak",
    trade: "Scaffolding technician",
    destination: "Doha, Qatar",
    quote:
      "Being assessed on practical knowledge gave me confidence that the right employer would notice my ability.",
    image: HOME_IMAGES[3],
  },
  {
    id: "nisha",
    name: "Nisha",
    trade: "Facilities supervisor",
    destination: "Toronto, Canada",
    quote:
      "Blucollarz helped turn years of work into a profile that employers abroad could understand and trust.",
    image: HOME_IMAGES[4],
  },
];

function storyAt(index: number): WorkerStory {
  const story = WORKER_STORIES[index];
  if (!story) throw new Error(`Missing worker story at index ${index}`);
  return story;
}

function WorkerImage({
  story,
  priority,
}: {
  story: WorkerStory;
  priority: boolean;
}) {
  return (
    <Image
      src={story.image}
      alt={`${story.name}, ${story.trade}`}
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className="object-cover"
      priority={priority}
    />
  );
}

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const showNext = useCallback(() => {
    setCurrentIndex((index) => (index + 1) % WORKER_STORIES.length);
  }, []);

  const showPrevious = useCallback(() => {
    setCurrentIndex(
      (index) => (index - 1 + WORKER_STORIES.length) % WORKER_STORIES.length,
    );
  }, []);

  const visibleStories = useMemo(() => {
    const total = WORKER_STORIES.length;
    return [-1, 0, 1].map((offset) => ({
      story: storyAt((currentIndex + offset + total) % total),
      position: offset,
    }));
  }, [currentIndex]);

  return (
    <section
      aria-labelledby="worker-stories-heading"
      className="relative mt-20 overflow-hidden py-10 outline-none sm:mt-24 sm:py-14"
    >
      <div className="w-full">
        <div className="flex flex-col gap-7 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              id="worker-stories-heading"
              className="font-heading text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
            >
              Skill deserves a future without borders
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed sm:text-[15px]">
              Blue-collar professionals using proof, interviews, and verified
              profiles to pursue serious opportunities worldwide.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={showPrevious}
              aria-label="Previous worker story"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <span className="text-muted-foreground min-w-16 text-center font-mono text-xs tabular-nums">
              {String(currentIndex + 1).padStart(2, "0")} /{" "}
              {String(WORKER_STORIES.length).padStart(2, "0")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={showNext}
              aria-label="Next worker story"
            >
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="relative mt-10 w-full sm:mt-12">
          <div className="relative z-20 grid w-full grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleStories.map(({ story, position }) => {
                const centered = position === 0;
                return (
                  <motion.article
                    key={story.id}
                    layout
                    initial={{ opacity: 0, x: position * 40, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "border-border bg-card relative z-20 flex w-full min-w-0 flex-col overflow-hidden border shadow-sm",
                      !centered && "hidden md:flex",
                      centered && "z-30",
                    )}
                  >
                    <div className="bg-muted relative aspect-4/3 overflow-hidden">
                      <WorkerImage story={story} priority={centered} />
                      <span className="bg-background/90 text-foreground absolute left-3 top-3 px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase backdrop-blur-sm">
                        {story.destination}
                      </span>
                    </div>

                    <div className="bg-primary relative flex flex-1 flex-col overflow-hidden px-6 py-6">
                      <PrimaryDither seed={`story-${story.id}`} opacity={0.75} />
                      <div className="relative z-10 flex flex-1 flex-col">
                        <HardHatIcon className="size-5 text-white/90" />
                        <blockquote className="mt-4 flex-1 text-base leading-7 text-white">
                          “{story.quote}”
                        </blockquote>
                        <div
                          aria-hidden
                          className="my-5 h-px w-full bg-white/25"
                        />
                        <div>
                          <p className="font-semibold text-white">{story.name}</p>
                          <p className="mt-1 text-xs text-white/75">
                            {story.trade}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {WORKER_STORIES.map((story, index) => (
            <button
              key={story.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-1.5 transition-all",
                index === currentIndex
                  ? "bg-primary w-7"
                  : "bg-border hover:bg-muted-foreground w-1.5",
              )}
              aria-label={`Show ${story.name}'s story`}
              aria-current={index === currentIndex ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
