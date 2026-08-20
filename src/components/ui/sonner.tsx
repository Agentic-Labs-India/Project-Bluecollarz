"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { type CSSProperties, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  PRIMARY_DITHER,
  PrimaryDither,
} from "@/components/landing/primary-dither";

function ToastDither() {
  const [hosts, setHosts] = useState<{ key: string; host: HTMLElement }[]>([]);

  useEffect(() => {
    const collect = () => {
      const next: { key: string; host: HTMLElement }[] = [];
      document
        .querySelectorAll<HTMLElement>("[data-sonner-toast]")
        .forEach((toast, index) => {
          if (!toast.dataset.ditherKey) {
            toast.dataset.ditherKey = `toast-${index}-${toast.dataset.type ?? "default"}`;
          }
          let host = toast.querySelector<HTMLElement>(
            ":scope > .cn-toast-dither",
          );
          if (!host) {
            host = document.createElement("div");
            host.className =
              "cn-toast-dither pointer-events-none absolute inset-0 overflow-hidden";
            host.setAttribute("aria-hidden", "true");
            toast.prepend(host);
          }
          next.push({ key: toast.dataset.ditherKey, host });
        });
      setHosts((prev) => {
        const same =
          prev.length === next.length &&
          prev.every(
            (item, i) =>
              item.key === next[i]?.key && item.host === next[i]?.host,
          );
        return same ? prev : next;
      });
    };

    collect();
    const toaster = document.querySelector("[data-sonner-toaster]");
    if (!toaster) return;
    const observer = new MutationObserver(collect);
    observer.observe(toaster, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return hosts.map(({ key, host }) =>
    createPortal(
      <PrimaryDither
        seed={key}
        opacity={0.9}
        wash={false}
        className="absolute inset-0"
      />,
      host,
    ),
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position={isMobile ? "top-left" : "bottom-right"}
        offset={isMobile ? 0 : 24}
        mobileOffset={{ top: 0, left: 0, right: 0 }}
        icons={{
          success: <CircleCheckIcon className="size-4" />,
          info: <InfoIcon className="size-4" />,
          warning: <TriangleAlertIcon className="size-4" />,
          error: <OctagonXIcon className="size-4" />,
          loading: <span className="size-3.5 animate-pulse bg-white/50" />,
        }}
        style={
          {
            "--normal-bg": PRIMARY_DITHER.colorBack,
            "--normal-text": "#fff",
            "--normal-border": "rgb(255 255 255 / 0.18)",
            "--border-radius": isMobile ? "0px" : "var(--radius)",
            ...(isMobile
              ? {
                  "--width": "100%",
                  "--offset-top": "0px",
                  "--offset-left": "0px",
                  "--offset-right": "0px",
                }
              : null),
          } as CSSProperties
        }
        toastOptions={{
          classNames: {
            toast: "cn-toast relative overflow-hidden",
            title: "relative z-10 text-white",
            description: "relative z-10 text-white/80",
            icon: "relative z-10 text-white",
            content: "relative z-10",
            closeButton: "relative z-10",
          },
        }}
        {...props}
      />
      <ToastDither />
    </>
  );
};

export { Toaster };
