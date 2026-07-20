"use client";

import { X } from "lucide-react";
import {
  type CSSProperties,
  type HTMLAttributes,
  useEffect,
  useState,
} from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BannerVariant = "rainbow" | "normal";

export function Banner({
  id,
  xColor,
  variant = "normal",
  changeLayout = true,
  height = "3rem",
  rainbowColors = [
    "color-mix(in oklch, var(--chart-1) 70%, transparent)",
    "color-mix(in oklch, var(--primary) 77%, transparent)",
    "color-mix(in oklch, var(--chart-3) 70%, transparent)",
    "color-mix(in oklch, var(--chart-2) 66%, transparent)",
  ],
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /**
   * @defaultValue 3rem
   */
  height?: string;

  xColor?: string;

  /**
   * @defaultValue 'normal'
   */
  variant?: BannerVariant;

  /**
   * For rainbow variant only, customise the colors
   */
  rainbowColors?: string[];

  /**
   * Change layout styles via --fd-banner-height
   *
   * @defaultValue true
   */
  changeLayout?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const globalKey = id ? `nd-banner-${id}` : null;

  useEffect(() => {
    if (globalKey) setOpen(localStorage.getItem(globalKey) !== "true");
  }, [globalKey]);

  if (!open) return null;

  return (
    <div
      id={id}
      {...props}
      className={cn(
        "sticky top-0 z-40 flex w-full flex-row items-center justify-center px-4 text-center text-sm font-medium",
        variant === "normal" && "bg-secondary",
        variant === "rainbow" && "bg-background",
        className,
      )}
      style={{
        height,
      }}
    >
      {changeLayout ? (
        <style>{`:root { --fd-banner-height: ${height}; }`}</style>
      ) : null}

      {variant === "rainbow"
        ? flow({
            colors: rainbowColors,
          })
        : null}
      {children}
      {id ? (
        <button
          type="button"
          aria-label="Close Banner"
          onClick={() => {
            setOpen(false);
            if (globalKey) {
              localStorage.setItem(globalKey, "true");
              window.dispatchEvent(new Event("banner-status-changed"));
            }
          }}
          className={cn(
            buttonVariants({
              variant: "ghost",
              className:
                "absolute inset-e-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground/50 md:inset-e-4",
              size: "icon",
            }),
          )}
        >
          <X color={xColor} />
        </button>
      ) : null}
    </div>
  );
}

const maskImage =
  "linear-gradient(to bottom,white,transparent), radial-gradient(circle at top center, white, transparent)";

function flow({ colors }: { colors: string[] }) {
  const style: CSSProperties = {
    maskImage,
    WebkitMaskImage: maskImage,
    maskComposite: "intersect",
    animation: "fd-moving-banner 20s linear infinite",
    backgroundImage: `repeating-linear-gradient(70deg, ${[...colors, colors[0]]
      .map((color, i) => `${color} ${(i * 50) / colors.length}%`)
      .join(", ")})`,
    backgroundSize: "200% 100%",
    filter: "saturate(2)",
  };

  return (
    <>
      <div className="absolute inset-0 -z-10" style={style} />
      <style>
        {`@keyframes fd-moving-banner {
            from { background-position: 0% 0;  }
            to { background-position: 100% 0;  }
         }`}
      </style>
    </>
  );
}
