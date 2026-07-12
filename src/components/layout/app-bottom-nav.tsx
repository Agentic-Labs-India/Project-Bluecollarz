"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppNavItem } from "@/lib/routes";

/** Fixed bottom navigation shown only on mobile. */
export function AppBottomNav({ items }: { items: AppNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-40 flex h-16 max-w-full items-stretch overflow-hidden border-t pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map((item) => {
        const isActive =
          pathname === item.url || pathname.startsWith(`${item.url}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.url}
            href={item.url}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors sm:text-[11px]",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon
              className="size-5 shrink-0"
              strokeWidth={isActive ? 2.25 : 1.75}
            />
            <span className="w-full truncate text-center leading-none">
              {item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
