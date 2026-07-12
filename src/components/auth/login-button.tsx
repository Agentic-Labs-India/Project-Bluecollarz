"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { getSessionProfileType } from "@/lib/auth/auth-actions";
import { signInWithGoogle } from "@/lib/auth/google-sign-in";
import {
  DEFAULT_PROFILE_TYPE,
  getProfileHomePath,
  type ProfileType,
} from "@/lib/profile-types";
import { cn } from "@/lib/utils";

export function LoginButton({
  className,
  children = "Log in",
  onBeforeOpen,
  profileType = DEFAULT_PROFILE_TYPE,
}: {
  className?: string;
  children?: React.ReactNode;
  onBeforeOpen?: () => void;
  /** Account type — defaults to Candidate (`work`). */
  profileType?: ProfileType;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (isPending || loading) return;
    onBeforeOpen?.();

    if (session?.user) {
      const profile = await getSessionProfileType();
      router.push(getProfileHomePath(profile));
      return;
    }

    setLoading(true);
    try {
      await signInWithGoogle(profileType);
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={cn(className, loading && "opacity-70")}
      onClick={() => void handleClick()}
      disabled={loading}
    >
      {children}
    </button>
  );
}
