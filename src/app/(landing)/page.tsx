import Link from "next/link";
import { Suspense } from "react";
import { LoginButton } from "@/components/auth/login-button";
import { ArcGalleryHero } from "@/components/landing/arc-gallery-hero";
import { LatestRolesCarousel } from "@/components/landing/latest-roles-carousel";
import { RoleCarouselSkeleton } from "@/components/landing/role-carousel-skeleton";
import { WorldMapLazy } from "@/components/ui/world-map-lazy";

const HERO_ARC_IMAGES = [1, 2, 3, 4, 5, 6, 7].map(
  (n) => `/images/home/${n}.png`,
);

const HERO_MAP_ROUTES = [
  {
    start: { lat: 28.6139, lng: 77.209, label: "New Delhi" },
    end: { lat: 25.2048, lng: 55.2708, label: "Dubai" },
  },
  {
    start: { lat: 19.076, lng: 72.8777, label: "Mumbai" },
    end: { lat: 40.7128, lng: -74.006, label: "New York" },
  },
  {
    start: { lat: 12.9716, lng: 77.5946, label: "Bangalore" },
    end: { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  },
  {
    start: { lat: 13.0827, lng: 80.2707, label: "Chennai" },
    end: { lat: 24.4539, lng: 54.3773, label: "UAE" },
  },
  {
    start: { lat: 25.5941, lng: 85.1376, label: "Bihar" },
    end: { lat: 37.5665, lng: 126.978, label: "Seoul" },
  },
  {
    start: { lat: 26.9124, lng: 75.7873, label: "Rajasthan" },
    end: { lat: 51.5074, lng: -0.1278, label: "London" },
  },
];

const STORIES = [
  {
    href: "/stories/ruby/",
    image:
      "https://cdn.sanity.io/images/h6s14f4z/production/69254df8e63160e92bd324d713e0115718bda24c-884x884.jpg",
    alt: "Asha, Facilities electrician",
    title: "Meet Asha: Facilities electrician",
    name: "Asha",
  },
  {
    href: "/stories/jay-international-business-consultant/",
    image:
      "https://cdn.sanity.io/images/h6s14f4z/production/199834d5d15bf607aff6a6c1ea66d681a6c3e038-2586x1556.png",
    alt: "Ravi - Meet Ravi: Site welder abroad",
    title: "Meet Ravi: Site welder abroad",
    name: "Ravi",
  },
  {
    href: "/stories/mick-computer-information-systems/",
    image:
      "https://cdn.sanity.io/images/h6s14f4z/production/309640570646595dbd60e7b7c06bc15c970df64a-1421x720.jpg",
    alt: "Omar - Meet Omar: Heavy vehicle driver",
    title: "Meet Omar: Heavy vehicle driver",
    name: "Omar",
  },
];

function PlayIcon() {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 16 16"
      className="text-canvas"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393" />
    </svg>
  );
}

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[1600px] overflow-x-clip px-6 py-4 duration-300 md:px-8 lg:px-14 2xl:mt-16">
      {/* Hero — on mobile stack cleanly (no overlap); pull-up only from sm+ */}
      <div className="mt-16 w-full text-center sm:mt-10 md:mt-12">
        <ArcGalleryHero images={HERO_ARC_IMAGES} />

        <div className="relative z-10 mt-5 sm:-mt-16 md:-mt-24 lg:-mt-28">
          <section className="border-canvas-soft bg-canvas mx-auto flex h-9 w-fit max-w-[calc(100%-0.5rem)] flex-row items-center justify-center gap-1 overflow-hidden text-nowrap rounded-full border px-3 py-0.5 text-[12px] font-medium text-muted-foreground shadow-sm sm:h-[38px] sm:px-5 sm:text-[12.75px] sm:bg-canvas/90 sm:backdrop-blur-sm">
            <div className="flex w-fit flex-row items-center justify-center gap-2.5 sm:gap-4">
              <p className="text-mute flex flex-row items-center gap-1.5 text-[12px] font-medium sm:text-[14px]">
                <span className="hidden font-normal sm:inline sm:translate-y-[-0.5px] sm:pr-4">
                  Avg. monthly pay
                </span>
                <span className="font-normal sm:hidden">Pay</span>
                <span className="text-foreground sm:translate-y-[-0.5px]">
                  $<span className="tabular-nums">2.8</span>k
                </span>
              </p>
              <div className="bg-muted h-6 w-px sm:h-9" />
              <p className="text-mute hidden flex-row items-center gap-1.5 text-[14px] font-medium sm:flex">
                <span className="font-normal sm:translate-y-[-0.5px] sm:pr-4">
                  Roles open
                </span>
                <span className="text-foreground sm:translate-y-[-0.5px]">
                  <span className="tabular-nums">12</span>k+
                </span>
              </p>
              <div className="bg-muted hidden h-9 w-px sm:block" />
              <p className="text-mute flex flex-row items-center gap-1.5 text-[12px] font-medium sm:text-[14px]">
                <span className="font-normal sm:translate-y-[-0.5px] sm:pr-4">
                  Countries
                </span>
                <span className="text-foreground sm:translate-y-[-0.5px]">
                  <span className="tabular-nums">40</span>+
                </span>
              </p>
            </div>
          </section>

          <h1 className="mt-5 text-[30px] font-normal leading-[1.15] sm:mt-7 sm:text-[42px] sm:leading-[1.1] md:mt-8 md:text-5xl md:leading-[1.1]">
            Work Abroad with us!
          </h1>
          <p className="text-foreground mx-auto mt-3 max-w-[22rem] px-1 text-sm leading-relaxed sm:mt-6 sm:max-w-[400px] sm:text-base">
            We help you find the jobs in USA, Canada, Australia, UK, Dubai, Europe, and more.
          </p>
          <div className="mt-5 flex w-full flex-row items-center justify-center gap-3 text-[15px] sm:mt-6">
            <LoginButton className="bg-primary text-primary-foreground hover:bg-primary-active rounded-md px-6 py-2 duration-200">
              Get Started
            </LoginButton>
            <Link
              className="bg-muted hover:bg-secondary flex flex-row items-center gap-1.5 rounded-md px-6 py-[9.5px] text-sm duration-200"
              href="/about"
            >
              About us
            </Link>
          </div>

          <div className="mx-auto mt-4 w-full max-w-5xl px-0 sm:mt-6 md:max-w-6xl">
            <WorldMapLazy
              dots={HERO_MAP_ROUTES}
              lineColor="var(--primary)"
              showLabels={false}
              animationDuration={2}
              loop
              compact
              focus={{ lat: 22.5, lng: 79, scale: 1.15 }}
              className="mx-auto max-sm:max-h-[180px]"
            />
          </div>
        </div>
      </div>

      <Suspense fallback={<RoleCarouselSkeleton />}>
        <LatestRolesCarousel />
      </Suspense>

      <div className="relative mt-20 @container">
        <div className="gap-6 space-y-16 @5xl:grid @5xl:grid-cols-4 @5xl:space-y-0">
          <Link
            id="primary-testimonial"
            className="group top-[68px] h-fit cursor-pointer duration-200 @5xl:sticky @5xl:col-span-3"
            href="/mission"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:aspect-video">
              <div className="relative grid h-full w-full scale-[1.02] cursor-pointer place-items-center overflow-hidden duration-300 group-hover:scale-[1.1]">
                <div className="absolute inset-0 bg-ink-deep" />
                <div className="absolute -left-1/4 -top-1/4 size-3/4 rounded-full bg-primary/70 blur-3xl" />
                <div className="absolute -right-1/4 top-1/4 size-2/3 rounded-full bg-primary/50 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 size-1/2 rounded-full bg-chart-2/50 blur-3xl" />
                <div className="absolute inset-0 bg-ink-deep/20" />
              </div>
              <div className="absolute inset-0 z-10 flex items-center justify-center font-medium duration-300 group-hover:scale-[1.02]">
                <div className="flex flex-row gap-4">
                  <p className="max-sm:text-light flex flex-row items-center gap-2 text-6xl font-thin tracking-wide text-canvas sm:text-8xl">
                    WORK
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 text-3xl sm:mt-6 sm:text-5xl">
              Built for blue-collar ambition
            </div>
            <div className="mt-4 flex flex-row items-center gap-3 text-sm sm:mt-6">
              <div>Mission</div>
              <div className="text-mute">Why BlueCollarz exists</div>
            </div>
          </Link>

          <div className="col-span-1 flex flex-col items-start justify-between pb-11 max-sm:space-y-12 @sm:flex @sm:gap-4 @2xl:flex-row @5xl:flex-col @5xl:gap-12">
            {STORIES.map((story) => (
              <Link key={story.href} className="group w-full" href={story.href}>
                <div className="relative aspect-square w-full overflow-hidden rounded-[8px] bg-muted/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={story.alt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-top duration-300 hover:scale-[1.02]"
                    src={story.image}
                  />
                  <div className="absolute right-3 top-3 grid place-items-center rounded-full bg-ink/50 p-2 opacity-0 duration-300 group-hover:opacity-100">
                    <PlayIcon />
                  </div>
                </div>
                <div className="mt-4 text-lg">{story.title}</div>
                <div className="mt-2 flex flex-row items-center gap-3 text-sm">
                  <div>{story.name}</div>
                  <div className="text-mute" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
