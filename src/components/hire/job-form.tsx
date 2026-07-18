"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPLICATION_STAGE_OPTIONS,
  DEFAULT_APPLICATION_STEP_TEMPLATES,
  JOB_LOCATIONS,
  JOB_LOCATION_LABELS,
  JOB_PRIORITIES,
  JOB_TABS,
  normalizeJobLocation,
  normalizeStepTemplates,
  type ApplicationStageId,
  type JobCreateInput,
} from "@/lib/jobs";
import { listCountries, listStatesForCountry } from "@/lib/geo/places";
import { OPPORTUNITY_TAB_LABELS } from "@/lib/opportunities";
import { LockIcon } from "lucide-react";

export type JobFormValues = JobCreateInput;

const defaultValues: JobFormValues = {
  title: "",
  pay: "",
  tab: "project",
  overview: "",
  location: "remote",
  countryCode: undefined,
  stateCode: undefined,
  priority: "medium",
  applicationStepTemplates: DEFAULT_APPLICATION_STEP_TEMPLATES,
  publish: false,
};

export function JobForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<JobFormValues>;
  submitLabel: string;
  onSubmit: (values: JobFormValues, publish: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>({
    ...defaultValues,
    ...initialValues,
    location: normalizeJobLocation(
      initialValues?.location ?? defaultValues.location,
    ),
    countryCode: initialValues?.countryCode || undefined,
    stateCode: initialValues?.stateCode || undefined,
    applicationStepTemplates: normalizeStepTemplates(
      initialValues?.applicationStepTemplates ??
        DEFAULT_APPLICATION_STEP_TEMPLATES,
    ),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const countries = useMemo(() => listCountries(), []);
  const states = useMemo(
    () => listStatesForCountry(values.countryCode ?? ""),
    [values.countryCode],
  );

  const update = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const setCountry = (countryCode: string) => {
    setValues((prev) => ({
      ...prev,
      countryCode: countryCode || undefined,
      stateCode: undefined,
    }));
  };

  const selectedStageIds = new Set(
    (values.applicationStepTemplates ?? []).map((s) => s.id),
  );

  const toggleStage = (stageId: ApplicationStageId, enabled: boolean) => {
    if (stageId === "resume") return;
    setValues((prev) => {
      const current = prev.applicationStepTemplates ?? [];
      const without = current.filter((s) => s.id !== stageId);
      const next = enabled
        ? [
            ...without,
            {
              id: stageId,
              label:
                APPLICATION_STAGE_OPTIONS.find((s) => s.id === stageId)?.label ??
                stageId,
            },
          ]
        : without;
      return {
        ...prev,
        applicationStepTemplates: normalizeStepTemplates(next),
      };
    });
  };

  const handleSubmit = async (publish: boolean) => {
    setLoading(true);
    setError("");
    try {
      await onSubmit(
        {
          ...values,
          applicationStepTemplates: normalizeStepTemplates(
            values.applicationStepTemplates,
          ),
          publish,
        },
        publish,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(false);
      }}
    >
      {error ? (
        <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="title">Role title</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Chemistry Expert (PhD)"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pay">Pay</Label>
          <Input
            id="pay"
            value={values.pay}
            onChange={(e) => update("pay", e.target.value)}
            placeholder="$100 – $130 / hour"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Role type</Label>
          <Select
            value={values.tab}
            onValueChange={(v) => update("tab", v as JobFormValues["tab"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_TABS.map((tab) => (
                <SelectItem key={tab} value={tab}>
                  {OPPORTUNITY_TAB_LABELS[tab]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={values.priority ?? "medium"}
            onValueChange={(v) =>
              update("priority", v as JobFormValues["priority"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Work arrangement</Label>
          <Select
            value={normalizeJobLocation(values.location)}
            onValueChange={(v) =>
              update("location", v as JobFormValues["location"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_LOCATIONS.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {JOB_LOCATION_LABELS[loc]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Country</Label>
          <Select
            value={values.countryCode ?? undefined}
            onValueChange={setCountry}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>State / province</Label>
          <Select
            value={values.stateCode ?? undefined}
            onValueChange={(v) => update("stateCode", v || undefined)}
            disabled={!values.countryCode || states.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !values.countryCode
                    ? "Select a country first"
                    : states.length === 0
                      ? "No states for this country"
                      : "Select state"
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {states.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="overview">Overview</Label>
        <RichTextEditor
          id="overview"
          value={values.overview}
          onChange={(html) => update("overview", html)}
          placeholder="Describe the role, expectations, and ideal candidate profile…"
        />
        <p className="text-muted-foreground text-xs">
          Rich text supported. Minimum 10 characters of content.
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-foreground text-sm font-semibold">
            Interview stages
          </h3>
          <p className="text-muted-foreground text-xs">
            Resume is always included. Add optional AI interviews for this role.
          </p>
        </div>

        <div className="space-y-2">
          {APPLICATION_STAGE_OPTIONS.map((stage) => {
            const enabled =
              stage.locked || selectedStageIds.has(stage.id);
            return (
              <label
                key={stage.id}
                className="border-border flex cursor-pointer items-start justify-between gap-4 border px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                    {stage.label}
                    {stage.locked ? (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-normal">
                        <LockIcon className="size-3" />
                        Required
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {stage.description}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  disabled={stage.locked || loading}
                  onCheckedChange={(checked) =>
                    toggleStage(stage.id, checked)
                  }
                />
              </label>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:flex-wrap">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          className="w-full sm:w-auto"
          onClick={() => void handleSubmit(true)}
        >
          {loading ? "Publishing…" : "Save & publish"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          className="w-full sm:w-auto"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
