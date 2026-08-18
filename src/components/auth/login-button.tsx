"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { signInWithGoogle } from "@/lib/auth/google-sign-in";
import {
  hasAgreedAdultAttestation,
  requestAdultGate,
} from "@/lib/compliance/age-gate";
import { getProfileHomePath } from "@/lib/user/profile-types";
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

    if (!hasAgreedAdultAttestation()) {
      requestAdultGate();
      toast.message("Confirm you are 18 or older to continue.");
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
