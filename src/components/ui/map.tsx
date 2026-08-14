"use client";

import { useId, useRef, useState, useMemo, type CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import DottedMap from "dotted-map";
import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string; image?: string };
    end: { lat: number; lng: number; label?: string; image?: string };
  }>;
  lineColor?: string;
  showLabels?: boolean;
  labelClassName?: string;
  animationDuration?: number;
  loop?: boolean;
  className?: string;
  compact?: boolean;
  /** Zoom the map around a lat/lng (e.g. India). */
  focus?: { lat: number; lng: number; scale?: number };
}

/** Photo circle that travels along a route — steady opacity, no fade while moving. */
function MapTravelAvatar({
  image,
  lineColor,
  radius,
  pathD,
  fullCycleDuration,
  startTime,
  endTime,
}: {
  image: string;
  lineColor: string;
  radius: number;
  pathD: string;
  fullCycleDuration: number;
  startTime: number;
  endTime: number;
}) {
  const clipId = `travel-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <motion.g
      initial={{ offsetDistance: "0%", opacity: 0 }}
      animate={{
        offsetDistance: ["0%", "0%", "100%", "100%", "100%"],
        opacity: [0, 1, 1, 0, 0],
      }}
      transition={{
        duration: fullCycleDuration,
        times: [0, startTime, endTime, endTime, 1],
        ease: "linear",
        repeat: Infinity,
        repeatDelay: 0,
      }}
      style={{
        offsetPath: `path('${pathD}')`,
        offsetRotate: "0deg",
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={0} cy={0} r={radius} />
        </clipPath>
      </defs>
      <image
        href={image}
        x={-radius}
        y={-radius}
        width={radius * 2}
        height={radius * 2}
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid slice"
      />
      <circle
        cx={0}
        cy={0}
        r={radius}
        fill="none"
        stroke={lineColor}
        strokeWidth={radius * 0.16}
      />
    </motion.g>
  );
}

function EndpointDot({
  x,
  y,
  lineColor,
  pointRadius,
  pulseMax,
  pulseDelay = "0s",
  onHoverStart,
  onHoverEnd,
}: {
  x: number;
  y: number;
  lineColor: string;
  pointRadius: number;
  pulseMax: number;
  pulseDelay?: string;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  return (
    <motion.g
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className="cursor-pointer"
      whileHover={{ scale: 1.2 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <circle
        cx={x}
        cy={y}
        r={pointRadius}
        fill={lineColor}
        filter="url(#glow)"
      />
      <circle cx={x} cy={y} r={pointRadius} fill={lineColor} opacity="0.5">
        <animate
          attributeName="r"
          from={String(pointRadius)}
          to={String(pulseMax)}
          dur="2s"
          begin={pulseDelay}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="0.6"
          to="0"
          dur="2s"
          begin={pulseDelay}
          repeatCount="indefinite"
        />
      </circle>
    </motion.g>
  );
}

export function WorldMap({
  dots = [],
  lineColor = "#0ea5e9",
  showLabels = true,
  labelClassName = "text-sm",
  animationDuration = 2,
  loop = true,
  className,
  compact = false,
  focus,
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const { theme } = useTheme();

  const map = useMemo(
    () => new DottedMap({ height: compact ? 80 : 100, grid: "diagonal" }),
    [compact],
  );

  const svgMap = useMemo(
    () =>
      map.getSVG({
        radius: compact ? 0.16 : 0.22,
        color: theme === "dark" ? "#ffffff35" : "#0e0f0c35",
        shape: "circle",
        backgroundColor: "transparent",
      }),
    [map, theme, compact],
  );

  /** Map grid size from SVG viewBox (width/height are private on DottedMap). */
  const mapSize = useMemo(() => {
    const match = svgMap.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
    return {
      width: match ? Number(match[1]) : 1,
      height: match ? Number(match[2]) : 1,
    };
  }, [svgMap]);

  /** Match dotted-map's default Mercator grid (not equirectangular). */
  const projectPoint = (lat: number, lng: number) => {
    const pin = map.getPin({ lat, lng });
    if (!pin) return { x: 0, y: 0 };
    return {
      x: (pin.x / mapSize.width) * 800,
      y: (pin.y / mapSize.height) * 400,
    };
  };

  const focusStyle = useMemo(() => {
    if (!focus) return undefined;
    const pin = map.getPin({ lat: focus.lat, lng: focus.lng });
    if (!pin) return undefined;
    const originX = (pin.x / mapSize.width) * 100;
    const originY = (pin.y / mapSize.height) * 100;
    const scale = focus.scale ?? 2.4;
    return {
      transform: `scale(${scale})`,
      transformOrigin: `${originX}% ${originY}%`,
    } as CSSProperties;
  }, [focus, map, mapSize]);

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - (compact ? 35 : 50);
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  const staggerDelay = compact ? 1.1 : 0.75;
  const totalAnimationTime = dots.length * staggerDelay + animationDuration;
  const pauseTime = compact ? 2.5 : 3;
  const fullCycleDuration = totalAnimationTime + pauseTime;

  const pointRadius = compact ? 2 : 3;
  // Compact hero map scales large on desktop — keep avatars modest.
  const travelAvatarRadius = compact ? 8 : 14;
  const travelRadius = compact ? 2 : 3;
  const pulseMax = compact ? 7 : 12;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden font-sans",
        compact
          ? "aspect-[2.6/1] max-h-[240px] bg-transparent sm:max-h-[280px] md:max-h-[320px] lg:max-h-[340px]"
          : "aspect-[2/1] rounded-lg bg-canvas md:aspect-[2.5/1] lg:aspect-[2/1] dark:bg-ink",
        className,
      )}
    >
      <div className="absolute inset-0" style={focusStyle}>
        <Image
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
          className={cn(
            "pointer-events-none h-full w-full select-none object-contain object-center",
            !compact &&
              "[mask-image:linear-gradient(to_bottom,transparent,white_10%,white_90%,transparent)]",
          )}
          alt="world map"
          height={compact ? 360 : 495}
          width={compact ? 792 : 1056}
          draggable={false}
          priority
        />
        <svg
          ref={svgRef}
          viewBox="0 0 800 400"
          className="pointer-events-auto absolute inset-0 h-full w-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow">
              <feMorphology operator="dilate" radius="0.5" />
              <feGaussianBlur stdDeviation="1" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {dots.map((dot, i) => {
            const startPoint = projectPoint(dot.start.lat, dot.start.lng);
            const endPoint = projectPoint(dot.end.lat, dot.end.lng);
            const pathD = createCurvedPath(startPoint, endPoint);

            const startTime = (i * staggerDelay) / fullCycleDuration;
            const endTime =
              (i * staggerDelay + animationDuration) / fullCycleDuration;
            const resetTime = totalAnimationTime / fullCycleDuration;
            const travelImage = dot.end.image || dot.start.image;

            return (
              <g key={`path-group-${i}`}>
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={compact ? 0.75 : 1}
                  strokeOpacity={0.85}
                  initial={{ pathLength: 0 }}
                  animate={
                    loop
                      ? { pathLength: [0, 0, 1, 1, 0] }
                      : { pathLength: 1 }
                  }
                  transition={
                    loop
                      ? {
                          duration: fullCycleDuration,
                          times: [0, startTime, endTime, resetTime, 1],
                          ease: "linear",
                          repeat: Infinity,
                          repeatDelay: 0,
                        }
                      : {
                          duration: animationDuration,
                          delay: i * staggerDelay,
                          ease: "linear",
                        }
                  }
                />

                {loop &&
                  (travelImage ? (
                    <MapTravelAvatar
                      image={travelImage}
                      lineColor={lineColor}
                      radius={travelAvatarRadius}
                      pathD={pathD}
                      fullCycleDuration={fullCycleDuration}
                      startTime={startTime}
                      endTime={endTime}
                    />
                  ) : (
                    <motion.circle
                      r={travelRadius}
                      fill={lineColor}
                      initial={{ offsetDistance: "0%", opacity: 0 }}
                      animate={{
                        offsetDistance: ["0%", "0%", "100%", "100%", "100%"],
                        opacity: [0, 1, 1, 0, 0],
                      }}
                      transition={{
                        duration: fullCycleDuration,
                        times: [0, startTime, endTime, endTime, 1],
                        ease: "linear",
                        repeat: Infinity,
                        repeatDelay: 0,
                      }}
                      style={{
                        offsetPath: `path('${pathD}')`,
                      }}
                    />
                  ))}
              </g>
            );
          })}

          {dots.map((dot, i) => {
            const startPoint = projectPoint(dot.start.lat, dot.start.lng);
            const endPoint = projectPoint(dot.end.lat, dot.end.lng);

            return (
              <g key={`points-group-${i}`}>
                <g key={`start-${i}`}>
                  <EndpointDot
                    x={startPoint.x}
                    y={startPoint.y}
                    lineColor={lineColor}
                    pointRadius={pointRadius}
                    pulseMax={pulseMax}
                    onHoverStart={() =>
                      setHoveredLocation(dot.start.label || `Location ${i}`)
                    }
                    onHoverEnd={() => setHoveredLocation(null)}
                  />

                  {showLabels && !compact && dot.start.label && (
                    <motion.g
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 * i + 0.3, duration: 0.5 }}
                      className="pointer-events-none"
                    >
                      <foreignObject
                        x={startPoint.x - 50}
                        y={startPoint.y - 35}
                        width="100"
                        height="30"
                        className="block"
                      >
                        <div className="flex h-full items-center justify-center">
                          <span
                            className={cn(
                              "rounded-md border border-canvas-soft bg-canvas/95 px-2 py-0.5 font-medium text-foreground shadow-sm",
                              labelClassName,
                            )}
                          >
                            {dot.start.label}
                          </span>
                        </div>
                      </foreignObject>
                    </motion.g>
                  )}
                </g>

                <g key={`end-${i}`}>
                  <EndpointDot
                    x={endPoint.x}
                    y={endPoint.y}
                    lineColor={lineColor}
                    pointRadius={pointRadius}
                    pulseMax={pulseMax}
                    pulseDelay="0.5s"
                    onHoverStart={() =>
                      setHoveredLocation(dot.end.label || `Destination ${i}`)
                    }
                    onHoverEnd={() => setHoveredLocation(null)}
                  />

                  {showLabels && dot.end.label && (
                    <motion.g
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 * i + 0.5, duration: 0.5 }}
                      className="pointer-events-none"
                    >
                      <foreignObject
                        x={endPoint.x - (compact ? 42 : 50)}
                        y={endPoint.y - (compact ? 28 : 35)}
                        width={compact ? 84 : 100}
                        height={compact ? 22 : 30}
                        className="block"
                      >
                        <div className="flex h-full items-center justify-center">
                          <span
                            className={cn(
                              "rounded-md border border-canvas-soft bg-canvas/95 px-1.5 py-0.5 font-medium text-foreground shadow-sm",
                              compact ? "text-[10px]" : labelClassName,
                            )}
                          >
                            {dot.end.label}
                          </span>
                        </div>
                      </foreignObject>
                    </motion.g>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {compact ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_34%,var(--canvas)_78%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--canvas)_0%,transparent_12%,transparent_88%,var(--canvas)_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,var(--canvas)_0%,transparent_14%,transparent_88%,var(--canvas)_100%)]"
          />
        </>
      ) : null}

      <AnimatePresence>
        {hoveredLocation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 left-2 rounded-lg border border-canvas-soft bg-canvas/90 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm sm:hidden"
          >
            {hoveredLocation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
