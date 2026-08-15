import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { cn } from "@/lib/utils";

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=75`;

const DESTINATIONS = [
  {
    name: "Dubai",
    image: unsplash("photo-1512453979798-5ea266f8880c"),
  },
  {
    name: "USA",
    image: unsplash("photo-1496442226666-8d4d0e62e6e9"),
  },
  {
    name: "Korea",
    image: unsplash("photo-1538485399081-7191377e8241"),
  },
  {
    name: "Singapore",
    image: unsplash("photo-1525625293386-3f8f99389edd"),
  },
  {
    name: "UAE",
    image: unsplash("photo-1518684079-3c830dcef090"),
  },
  {
    name: "Brazil",
    image: unsplash("photo-1544989164-31dc3c645987"),
  },
  {
    name: "UK",
    image: unsplash("photo-1513635269975-59663e0ac1ad"),
  },
  {
    name: "Canada",
    image: unsplash("photo-1517935706615-2717063c2225"),
  },
  {
    name: "Australia",
    image: unsplash("photo-1506973035872-a4ec16b8e8d9"),
  },
] as const;

export function TrustedBy() {
  return (
    <section
      aria-labelledby="trusted-by-heading"
      className="relative mt-16 py-10 sm:mt-20 sm:py-14 md:mt-24"
    >
      <div className="grid w-full gap-2 lg:grid-cols-4 lg:items-stretch">
        <div className="bg-primary text-primary-foreground relative flex min-h-64 flex-col justify-between overflow-hidden p-6 sm:min-h-72 sm:p-8 lg:min-h-full">
          <PrimaryDither seed="trusted-worldwide" opacity={0.6} />

          <div className="relative z-10 max-w-xs">
            <p className="text-primary-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase sm:text-xs">
              Trusted worldwide
            </p>
            <h2
              id="trusted-by-heading"
              className="font-heading mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
            >
              Trusted by teams and companies around the world
            </h2>
          </div>

          <Link
            href="/candidate/explore"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 relative z-10 mt-8 inline-flex w-fit items-center gap-1.5 px-3.5 py-2 text-sm font-medium duration-200"
          >
            Find Jobs
            <ArrowUpRightIcon className="size-3.5" strokeWidth={2.25} />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-3 lg:grid-rows-3">
          {DESTINATIONS.map((destination) => (
            <li
              key={destination.name}
              className={cn(
                "border-border relative aspect-5/3 overflow-hidden border lg:aspect-auto lg:min-h-36",
                destination.name === "Brazil" && "hidden sm:list-item",
              )}
            >
              <Image
                src={destination.image}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
                className="object-cover"
              />
              <div className="absolute inset-0" />
              <span className="font-heading absolute inset-x-0 bottom-0 p-3 text-lg font-semibold tracking-tight text-white sm:p-4 sm:text-xl md:text-2xl">
                {destination.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
