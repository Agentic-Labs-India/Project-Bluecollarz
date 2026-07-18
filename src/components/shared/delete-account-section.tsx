"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import type { ProfileType } from "@/lib/profile-types";
import { getProfileIdLabel } from "@/lib/profile-types";

export function DeleteAccountSection({
  profileType,
}: {
  profileType: ProfileType;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const label = getProfileIdLabel(profileType);

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: err } = await authClient.deleteUser();
      if (err) {
        setError(err.message || "Could not delete your account.");
        setLoading(false);
        return;
      }
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not delete your account.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-foreground text-sm font-medium">Delete {label} profile</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Permanently removes this account and related data. You can sign up again
          later with Google as a Candidate or Recruiter.
        </p>
        {error ? (
          <p className="text-destructive mt-2 text-sm">{error}</p>
        ) : null}
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (loading) return;
          setOpen(next);
          if (!next) setError("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="shrink-0">
            <Trash2Icon className="size-4" />
            Delete profile
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your {label} profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Your account, sessions, and related
              {profileType === "hire"
                ? " roles, applicants, and interview data"
                : " applications, interviews, and recordings"}{" "}
              will be removed. You can create a new account with Google
              afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={loading}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {loading ? "Deleting…" : "Yes, delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
