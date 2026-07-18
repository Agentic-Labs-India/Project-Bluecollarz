"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BadgeCheckIcon,
  BellIcon,
  CookieIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  PreferenceDialog,
  fetchUserPreferences,
  patchUserPreferences,
  type PreferenceKind,
} from "@/components/layout/preference-dialog";
import type { UserPreferences } from "@/lib/user/preferences";

type AppUser = { name: string; email: string; avatar: string };

function UserMenuDropdown({
  user,
  profileHref,
  side = "right",
  align = "end",
}: {
  user: AppUser;
  profileHref: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const initial = user.name?.charAt(0)?.toUpperCase() || "U";

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ring-primary/20 focus-visible:ring-primary rounded-full ring-offset-2 outline-none focus-visible:ring-2"
          aria-label="Account menu"
        >
          <Avatar className="size-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            Toggle theme
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(profileHref)}>
            <BadgeCheckIcon />
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Desktop rail: cookie / notifications + avatar dropdown. */
export function AppUserMenu({
  user,
  profileHref,
  className,
}: {
  user: AppUser;
  profileHref: string;
  className?: string;
}) {
  const [openKind, setOpenKind] = React.useState<PreferenceKind | null>(null);
  const [prefs, setPrefs] = React.useState<UserPreferences>({
    cookiesEnabled: true,
    notificationsEnabled: true,
  });
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const loadPreferences = React.useEffectEvent(async () => {
    try {
      const next = await fetchUserPreferences();
      setPrefs(next);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  });

  React.useEffect(() => {
    if (openKind && !loaded) {
      void loadPreferences();
    }
  }, [openKind, loaded]);

  const handleToggle = async (kind: PreferenceKind, enabled: boolean) => {
    const key =
      kind === "cookies" ? "cookiesEnabled" : "notificationsEnabled";
    const previous = prefs;
    setPrefs((current) => ({ ...current, [key]: enabled }));
    setSaving(true);
    try {
      const next = await patchUserPreferences({ [key]: enabled });
      setPrefs(next);
    } catch {
      setPrefs(previous);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-2 pb-4 pt-2",
        className,
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors"
        aria-label="Cookie preferences"
        onClick={() => setOpenKind("cookies")}
      >
        <CookieIcon className="size-4" strokeWidth={1.75} />
      </button>

      <button
        type="button"
        className="text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors"
        aria-label="Notifications"
        onClick={() => setOpenKind("notifications")}
      >
        <BellIcon className="size-4" strokeWidth={1.75} />
      </button>

      <UserMenuDropdown user={user} profileHref={profileHref} side="right" />

      <PreferenceDialog
        kind="cookies"
        open={openKind === "cookies"}
        onOpenChange={(open) => setOpenKind(open ? "cookies" : null)}
        enabled={prefs.cookiesEnabled}
        saving={saving}
        onEnabledChange={(enabled) => void handleToggle("cookies", enabled)}
      />
      <PreferenceDialog
        kind="notifications"
        open={openKind === "notifications"}
        onOpenChange={(open) => setOpenKind(open ? "notifications" : null)}
        enabled={prefs.notificationsEnabled}
        saving={saving}
        onEnabledChange={(enabled) =>
          void handleToggle("notifications", enabled)
        }
      />
    </div>
  );
}

/** Mobile top bar: avatar-only trigger with the same account menu. */
export function AppUserMenuButton({
  user,
  profileHref,
}: {
  user: AppUser;
  profileHref: string;
}) {
  return (
    <UserMenuDropdown
      user={user}
      profileHref={profileHref}
      side="bottom"
      align="end"
    />
  );
}
