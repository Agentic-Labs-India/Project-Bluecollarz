"use client";

import dynamic from "next/dynamic";
import type { MapProps } from "@/components/ui/map";

const WorldMap = dynamic(
  () => import("@/components/ui/map").then((m) => m.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 aspect-[2/1] w-full animate-pulse rounded-none" />
    ),
  },
);

/**
 * Client wrapper that defers the heavy map bundle (framer-motion + dotted-map)
 * so it loads after hydration and stays out of the initial page bundle.
 */
export function WorldMapLazy(props: MapProps) {
  return <WorldMap {...props} />;
}
