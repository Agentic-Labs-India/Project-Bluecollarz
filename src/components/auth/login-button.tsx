"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { signInWithGoogle } from "@/lib/auth/google-sign-in";
import {
  hasAgreedToSite,
  requestSiteAgreement,
} from "@/lib/compliance/site-agreement";
import { getProfileHomePath, parseProfileType } from "@/lib/user/profile-types";
import { cn } from "@/lib/utils";

export const DIGILOCKER_START_PATH = "/api/auth/digilocker/start";

export function LoginButton({
  className,
  children = "Log in",
  mode = "candidate",
  onBeforeOpen,
}: {
  className?: string;
  children?: React.ReactNode;
  mode?: "candidate" | "corporate";
  onBeforeOpen?: () => void;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (isPending || loading) return;
    onBeforeOpen?.();

    if (session?.user) {
      const profileType = parseProfileType(session.user.profileType);
      if (profileType) router.push(getProfileHomePath(profileType));
      return;
    }

    if (!hasAgreedToSite()) {
      requestSiteAgreement();
      toast.message("Please agree to continue.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "corporate") {
        await signInWithGoogle();
        return;
      }
      window.location.assign(DIGILOCKER_START_PATH);
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
