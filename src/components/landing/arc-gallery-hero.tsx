"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ArcGalleryHeroProps = {
  images: string[];
  className?: string;
};

type ArcDimensions = {
  radius: number;
  cardSize: number;
  startAngle: number;
  endAngle: number;
  /** How many images to show at this breakpoint. */
  maxImages: number;
};

const BREAKPOINTS: {
  maxWidth: number | null;
  dims: ArcDimensions;
}[] = [
  // Phone — compact fan that fits the viewport; no overlap with copy.
  {
    maxWidth: 640,
    dims: {
      radius: 260,
      cardSize: 72,
      startAngle: 68,
      endAngle: 112,
      maxImages: 5,
    },
  },
  // Tablet
  {
    maxWidth: 1024,
    dims: {
      radius: 720,
      cardSize: 148,
      startAngle: 58,
      endAngle: 122,
      maxImages: 7,
    },
  },
  // Desktop
  {
    maxWidth: null,
    dims: {
      radius: 1050,
      cardSize: 208,
      startAngle: 58,
      endAngle: 122,
      maxImages: 7,
    },
  },
];

function dimsForWidth(width: number): ArcDimensions {
  for (const bp of BREAKPOINTS) {
    if (bp.maxWidth === null || width < bp.maxWidth) return bp.dims;
  }
  return BREAKPOINTS[BREAKPOINTS.length - 1].dims;
}

/**
 * Slightly arched row of portrait cards above the home hero badges.
 * Entrance animation via motion/react.
 */
export function ArcGalleryHero({ images, className }: ArcGalleryHeroProps) {
  const reduceMotion = useReducedMotion();
  // Default to mobile dims to avoid desktop-sized SSR flash on phones.
  const [dimensions, setDimensions] = useState<ArcDimensions>(
    BREAKPOINTS[0].dims,
  );

  useEffect(() => {
    const handleResize = () => {
      setDimensions(dimsForWidth(window.innerWidth));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { radius, cardSize, startAngle, endAngle, maxImages } = dimensions;
  const visible = images.slice(0, maxImages);
  const count = Math.max(visible.length, 2);
  const step = (endAngle - startAngle) / (count - 1);

  const yAt = (deg: number) => Math.sin((deg * Math.PI) / 180) * radius;
  const minY = Math.min(yAt(startAngle), yAt(endAngle));
  const maxY = yAt((startAngle + endAngle) / 2);
  // Enough room for full cards so nothing looks clipped mid-frame.
  const shellHeight = maxY - minY + cardSize * 0.95;

  return (
    <div
      className={cn(
        "pointer-events-none relative mx-auto w-full max-w-[1400px] overflow-hidden",
        className,
      )}
      style={{ height: shellHeight }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: -minY + cardSize * 0.2 }}
      >
        {visible.map((src, i) => {
          const angle = startAngle + step * i;
          const angleRad = (angle * Math.PI) / 180;
          const x = Math.cos(angleRad) * radius;
          const y = Math.sin(angleRad) * radius;
          const tilt = (angle - 90) / 10;

          return (
            <motion.div
              key={`${src}-${i}`}
              className="absolute"
              style={{
                width: cardSize,
                height: cardSize,
                left: `calc(50% + ${x}px)`,
                bottom: `${y}px`,
                zIndex: count - i,
              }}
              initial={
                reduceMotion
                  ? { opacity: 1, x: "-50%", y: "50%" }
                  : { opacity: 0, x: "-50%", y: "60%" }
              }
              animate={{ opacity: 1, x: "-50%", y: "50%" }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.7,
                      delay: i * 0.07,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
            >
              <div
                className="border-border bg-muted relative size-full overflow-hidden rounded-[12px] border shadow-sm"
                style={{ transform: `rotate(${tilt}deg)` }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 72px, (max-width: 1024px) 148px, 208px"
                  className="object-cover"
                  draggable={false}
                  priority={i < 4}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
