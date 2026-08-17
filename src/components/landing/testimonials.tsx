import Image from "next/image";
import { HOME_IMAGES } from "@/components/landing/home-images";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { cn } from "@/lib/utils";

type WorkerStory = {
  id: string;
  name: string;
  trade: string;
  quote: string;
  image: string;
};

type StoryCardVariant = "grid" | "dither";

const WORKER_STORIES: WorkerStory[] = [
  {
    id: "asha",
    name: "Asha",
    trade: "Facilities electrician",
    quote:
      "My experience finally became more than a line on a CV. I could show what I know and apply with confidence.",
    image: HOME_IMAGES[0],
  },
  {
    id: "ravi",
    name: "Ravi",
    trade: "Structural welder",
    quote:
      "The interview focused on the work I actually do. That gave me a fair chance to prove my trade.",
    image: HOME_IMAGES[1],
  },
  {
    id: "omar",
    name: "Omar",
    trade: "Heavy vehicle driver",
    quote:
      "Everything was clear—from the role and pay to the next stage. I always knew what I needed to complete.",
    image: HOME_IMAGES[2],
  },
  {
    id: "meena",
    name: "Meena",
    trade: "Hospitality supervisor",
    quote:
      "I could complete the process step by step on my phone and understand exactly where my application stood.",
    image: HOME_IMAGES[5],
  },
  {
    id: "arjun",
    name: "Arjun",
    trade: "HVAC technician",
    quote:
      "My skills were assessed directly. That mattered more than having the perfect English resume.",
    image: HOME_IMAGES[6],
  },
];

function storyAt(index: number): WorkerStory {
  const story = WORKER_STORIES[index];
  if (!story) throw new Error(`Missing worker story at index ${index}`);
  return story;
}

function GridOverlay({ onDither }: { onDither?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 bg-size-[50px_56px] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]",
        onDither
          ? "bg-[linear-gradient(to_right,color-mix(in_oklab,var(--primary-foreground)_20%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--primary-foreground)_20%,transparent)_1px,transparent_1px)]"
          : "bg-[linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_12%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_12%,transparent)_1px,transparent_1px)]",
      )}
    />
  );
}

function StoryCard({
  story,
  variant,
  showGrid,
  className,
}: {
  story: WorkerStory;
  variant: StoryCardVariant;
  showGrid?: boolean;
  className?: string;
}) {
  const dither = variant === "dither";
  const grid = showGrid || variant === "grid";

  return (
    <article
      className={cn(
        "relative flex flex-col justify-end overflow-hidden border px-5 pb-5 pt-10 sm:px-6 sm:pb-6 sm:pt-12",
        dither
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-card-foreground",
        className,
      )}
    >
      {dither ? (
        <PrimaryDither seed={`story-${story.id}`} opacity={0.72} />
      ) : null}
      {grid ? <GridOverlay onDither={dither} /> : null}

      <div className="relative z-10 mt-auto">
        <blockquote className="text-sm leading-relaxed sm:text-[15px]">
          “{story.quote}”
        </blockquote>
        <div className="flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0">
            <h3 className="font-heading truncate text-sm font-semibold sm:text-base lg:text-xl">
              {story.name}
            </h3>
            <p
              className={cn(
                "truncate text-xs sm:text-sm",
                dither ? "text-primary-foreground/75" : "text-muted-foreground",
              )}
            >
              {story.trade}
            </p>
          </div>
          <Image
            src={story.image}
            alt={`${story.name}, ${story.trade}`}
            width={128}
            height={128}
            sizes="64px"
            className="size-12 shrink-0 object-cover sm:size-14 lg:size-16"
          />
        </div>
      </div>
    </article>
  );
}

export default function Testimonials() {
  return (
    <section
      aria-labelledby="worker-stories-heading"
      className="relative mt-20 py-10 sm:mt-24 sm:py-14"
    >
      <div className="mx-auto max-w-3xl space-y-2 text-center">
        <h2
          id="worker-stories-heading"
          className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
        >
          Skill deserves a future without borders
        </h2>
        <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed sm:text-[15px]">
          Blue-collar professionals using proof, interviews, and verified
          profiles to pursue serious opportunities worldwide.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-2 sm:mt-12 lg:grid lg:grid-cols-3 lg:items-stretch">
        <div className="flex flex-col gap-2 md:flex-row lg:h-full lg:flex-col">
          <StoryCard
            story={storyAt(0)}
            variant="grid"
            className="min-h-56 flex-6 md:min-h-72 lg:min-h-80 lg:flex-7"
          />
          <StoryCard
            story={storyAt(1)}
            variant="dither"
            className="min-h-48 flex-4 lg:flex-3"
          />
        </div>

        <StoryCard
          story={storyAt(2)}
          variant="dither"
          showGrid
          className="min-h-72 lg:h-full lg:min-h-full"
        />

        <div className="flex flex-col gap-2 md:flex-row lg:h-full lg:flex-col">
          <StoryCard
            story={storyAt(3)}
            variant="dither"
            className="min-h-48 flex-4 lg:flex-3"
          />
          <StoryCard
            story={storyAt(4)}
            variant="grid"
            className="min-h-56 flex-6 md:min-h-72 lg:min-h-80 lg:flex-7"
          />
        </div>
      </div>
    </section>
  );
}
