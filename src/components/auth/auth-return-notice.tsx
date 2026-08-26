"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/** Surface DigiLocker / corporate Google errors from OAuth return URLs. */
export function AuthReturnNotice() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("corporate") === "denied") {
      toast.error(
        "Google sign-in is for recruiters and admins. Use Corporate Login after your email is provisioned.",
      );
      return;
    }
    if (searchParams.get("digilocker") === "error") {
      const message =
        searchParams.get("message")?.trim() ||
        "DigiLocker sign-in failed. Please try again.";
      toast.error(message);
    }
  }, [searchParams]);

  return null;
}
