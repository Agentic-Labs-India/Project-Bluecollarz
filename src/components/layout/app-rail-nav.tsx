"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppNavItem } from "@/lib/routes";

/** Vertical icon rail navigation used inside the desktop sidebar. */
export function AppRailNav({ items }: { items: AppNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col items-center gap-1 px-2 pt-2">
      {items.map((item) => {
        const isActive =
          pathname === item.url || pathname.startsWith(`${item.url}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.url}
            href={item.url}
            className={cn(
              "flex w-full flex-col items-center gap-1 rounded-none px-1 py-2.5 text-[10px] font-medium leading-tight transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-5 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
              strokeWidth={isActive ? 2.25 : 1.75}
            />
            <span className="max-w-full truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
