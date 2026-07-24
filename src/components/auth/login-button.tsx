"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { signInWithGoogle } from "@/lib/auth/google-sign-in";
import { getProfileHomePath } from "@/lib/profile-types";
import { cn } from "@/lib/utils";

export function LoginButton({
  className,
  children = "Log in",
  onBeforeOpen,
}: {
  className?: string;
  children?: React.ReactNode;
  onBeforeOpen?: () => void;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (isPending || loading) return;
    onBeforeOpen?.();

    if (session?.user) {
      router.push(getProfileHomePath(session.user.profileType));
      return;
    }

    setLoading(true);
    try {
      await signInWithGoogle();
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
