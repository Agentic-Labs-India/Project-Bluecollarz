"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  JobForm,
  type JobFormValues,
  jobFormPayload,
} from "@/components/hire/job-form";
import { AppPage } from "@/components/layout/app-page";
import { Button } from "@/components/ui/button";

export function NewRoleClient() {
  const router = useRouter();
  /** Bump to remount JobForm (clears fields after create / bfcache restore). */
  const [formKey, setFormKey] = useState(() => Date.now());

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setFormKey(Date.now());
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function createJob(values: JobFormValues, publish: boolean) {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobFormPayload(values, publish)),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json.code === "ONBOARDING_INCOMPLETE") {
        router.push("/hire/onboarding");
        return;
      }
      throw new Error(json.error || "Failed to create role");
    }
    setFormKey(Date.now());
    router.push(`/hire/roles/${json.id}`);
  }

  return (
    <AppPage>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mb-4 -ml-2"
        aria-label="Back"
        onClick={() => router.push("/hire/roles")}
      >
        <ArrowLeftIcon className="size-4" />
      </Button>
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Post a role
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Define the role details and application steps. You can save as draft
          or publish immediately. This role will be linked to your hirer
          account.
        </p>
      </div>
      <JobForm key={formKey} submitLabel="Save draft" onSubmit={createJob} />
    </AppPage>
  );
}
