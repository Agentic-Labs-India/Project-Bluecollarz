"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobForm, type JobFormValues } from "@/components/hire/job-form";
import { AppPage } from "@/components/layout/app-page";
import { normalizeJobLocation } from "@/lib/jobs";

function buildJobPayload(values: JobFormValues, publish: boolean) {
  const steps = values.applicationStepTemplates
    ?.map((step) => ({
      id: step.id,
      label: step.label.trim(),
    }))
    .filter((step) => step.label.length > 0);

  return {
    title: values.title.trim(),
    pay: values.pay.trim(),
    tab: values.tab,
    overview: values.overview.trim(),
    location: values.location
      ? normalizeJobLocation(values.location)
      : "remote",
    countryCode: values.countryCode || undefined,
    stateCode: values.stateCode || undefined,
    priority: values.priority,
    applicationStepTemplates: steps?.length ? steps : undefined,
    customQuestions: values.customQuestions ?? [],
    publish,
  };
}

export function NewRoleClient() {
  const router = useRouter();

  async function createJob(values: JobFormValues, publish: boolean) {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildJobPayload(values, publish)),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json.code === "PROFILE_INCOMPLETE") {
        router.push("/hire/profile?complete=required");
        return;
      }
      throw new Error(json.error || "Failed to create role");
    }
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
          or publish immediately. This role will be linked to your hirer account.
        </p>
      </div>
      <JobForm submitLabel="Save draft" onSubmit={createJob} />
    </AppPage>
  );
}
