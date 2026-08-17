"use client";

import { LockIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useImperativeHandle, useMemo, useState } from "react";
import { CustomQuestionsBuilder } from "@/components/hire/custom-questions-builder";
import { JobOverviewAiMaker } from "@/components/hire/job-overview-ai-maker";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  countryName,
  listCountries,
  listStatesForCountry,
  stateName,
} from "@/lib/core/geo/places";
import { currencyLabel, listCurrencies } from "@/lib/core/money/currencies";
import {
  APPLICATION_STAGE_OPTIONS,
  type ApplicationStageId,
  DEFAULT_APPLICATION_STEP_TEMPLATES,
  DEFAULT_CURRENCY,
  DEFAULT_PAY_TYPE,
  formatJobPay,
  formatJobValidationError,
  JOB_LOCATION_LABELS,
  JOB_LOCATIONS,
  JOB_PAY_TYPE_LABELS,
  JOB_PAY_TYPES,
  JOB_PRIORITIES,
  JOB_TABS,
  type JobCreateInput,
  type JobPayType,
  normalizeCustomQuestions,
  normalizeStepTemplates,
  sanitizePayAmountInput,
} from "@/lib/jobs";
import { customQuestionsSchema } from "@/lib/jobs/custom-questions";
import { OPPORTUNITY_TAB_LABELS } from "@/lib/jobs/opportunities";

export type JobFormValues = Omit<JobCreateInput, "payAmount"> & {
  payAmount: string;
};

export type JobFormHandle = {
  submit: (publish: boolean) => Promise<void>;
};

export function jobFormPayload(values: JobFormValues, publish: boolean) {
  const applicationStepTemplates = values.applicationStepTemplates
    ?.map((step) => ({ id: step.id, label: step.label.trim() }))
    .filter((step) => step.label.length > 0);

  return {
    title: values.title.trim(),
    payAmount: values.payAmount,
    payType: values.payType,
    payCurrency: values.payCurrency,
    tab: values.tab,
    overview: values.overview.trim(),
    location: values.location,
    countryCode: values.countryCode || null,
    stateCode: values.stateCode || null,
    priority: values.priority,
    applicationStepTemplates: applicationStepTemplates?.length
      ? applicationStepTemplates
      : undefined,
    customQuestions: values.customQuestions ?? [],
    raRcNumber: values.raRcNumber?.trim() || null,
    publish,
  };
}

const defaultValues: JobFormValues = {
  title: "",
  payAmount: "",
  payType: DEFAULT_PAY_TYPE,
  payCurrency: DEFAULT_CURRENCY,
  tab: "full-time",
  overview: "",
  location: "on-site",
  countryCode: undefined,
  stateCode: undefined,
  priority: "medium",
  applicationStepTemplates: DEFAULT_APPLICATION_STEP_TEMPLATES,
  customQuestions: [],
  raRcNumber: null,
  publish: false,
};

export function JobForm({
  initialValues,
  submitLabel,
  onSubmit,
  hideActions = false,
  onBusyChange,
  onCancel,
  ref,
}: {
  initialValues?: Partial<JobFormValues>;
  submitLabel: string;
  onSubmit: (values: JobFormValues, publish: boolean) => Promise<void>;
  /** Hide inline footer actions (use when parent renders them elsewhere). */
  hideActions?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onCancel?: () => void;
  ref?: React.Ref<JobFormHandle>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>({
    ...defaultValues,
    ...initialValues,
    payAmount:
      initialValues?.payAmount != null
        ? String(initialValues.payAmount)
        : defaultValues.payAmount,
    applicationStepTemplates: normalizeStepTemplates(
      initialValues?.applicationStepTemplates ??
        DEFAULT_APPLICATION_STEP_TEMPLATES,
    ),
    customQuestions: normalizeCustomQuestions(
      initialValues?.customQuestions ?? [],
    ),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setBusy = (busy: boolean) => {
    setLoading(busy);
    onBusyChange?.(busy);
  };

  const countries = useMemo(() => listCountries(), []);
  const currencies = useMemo(() => listCurrencies(), []);
  const currencyLabels = useMemo(
    () => currencies.map((item) => item.label),
    [currencies],
  );
  const states = useMemo(
    () => listStatesForCountry(values.countryCode ?? ""),
    [values.countryCode],
  );
  const payLabel = useMemo(() => {
    const amount = Number(values.payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return "";
    return formatJobPay(amount, values.payCurrency, values.payType);
  }, [values.payAmount, values.payCurrency, values.payType]);

  const locationLabel = useMemo(() => {
    const arrangement = values.location
      ? JOB_LOCATION_LABELS[values.location]
      : "";
    const place = [
      stateName(values.countryCode, values.stateCode),
      countryName(values.countryCode),
    ]
      .filter(Boolean)
      .join(", ");
    return [arrangement, place].filter(Boolean).join(" · ");
  }, [values.location, values.countryCode, values.stateCode]);

  const update = <K extends keyof JobFormValues>(
    key: K,
    value: JobFormValues[K],
  ) => {
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
                APPLICATION_STAGE_OPTIONS.find((s) => s.id === stageId)
                  ?.label ?? stageId,
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
    setBusy(true);
    setError("");
    try {
      const templates = normalizeStepTemplates(values.applicationStepTemplates);
      let customQuestions = templates.some((s) => s.id === "custom-questions")
        ? (values.customQuestions ?? [])
        : [];
      if (templates.some((s) => s.id === "custom-questions")) {
        const parsed = customQuestionsSchema.safeParse(customQuestions);
        if (!parsed.success) {
          setError(formatJobValidationError(parsed.error));
          return;
        }
        if (parsed.data.length === 0) {
          setError("Add at least one custom question for that stage.");
          return;
        }
        customQuestions = parsed.data;
      }
      await onSubmit(
        {
          ...values,
          applicationStepTemplates: templates,
          customQuestions,
          publish,
        },
        publish,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }));

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
          <Label htmlFor="payAmount">Pay</Label>
          <Input
            id="payAmount"
            inputMode="decimal"
            autoComplete="off"
            value={values.payAmount}
            onChange={(e) =>
              update("payAmount", sanitizePayAmountInput(e.target.value))
            }
            placeholder="5000"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Pay type</Label>
          <Select
            value={values.payType}
            onValueChange={(v) => update("payType", v as JobPayType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_PAY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {JOB_PAY_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Combobox
            items={currencyLabels}
            value={currencyLabel(values.payCurrency)}
            onValueChange={(value) => {
              const selected =
                typeof value === "string"
                  ? currencies.find(
                      (item) => item.label === value || item.code === value,
                    )
                  : undefined;
              update("payCurrency", selected?.code ?? DEFAULT_CURRENCY);
            }}
          >
            <ComboboxInput
              className="w-full"
              placeholder="Search currency…"
              showClear={false}
            />
            <ComboboxContent className="w-[var(--anchor-width)]">
              <ComboboxEmpty>No currency found.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        <div className="space-y-2">
          <Label htmlFor="raRcNumber">Recruiting Agent RC number</Label>
          <Input
            id="raRcNumber"
            value={values.raRcNumber ?? ""}
            onChange={(e) =>
              update(
                "raRcNumber",
                e.target.value.trim() ? e.target.value : null,
              )
            }
            placeholder="MEA RA RC number (optional)"
            maxLength={64}
          />
          <p className="text-muted-foreground text-xs">
            Used for Emigration Model 2 binding when a licensed RA is attached
            to this role.
          </p>
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
            value={values.location}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="overview">Overview</Label>
          <JobOverviewAiMaker
            context={{
              title: values.title,
              pay: payLabel,
              locationLabel,
              employmentType: OPPORTUNITY_TAB_LABELS[values.tab],
            }}
            onApply={(html) => update("overview", html)}
          />
        </div>
        <RichTextEditor
          id="overview"
          value={values.overview}
          onChange={(html) => update("overview", html)}
          placeholder="Describe the role, expectations, and ideal candidate profile…"
        />
        <p className="text-muted-foreground text-xs">
          Rich text supported. Minimum 10 characters of content. Use AI overview
          maker for a starting draft, then edit.
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-foreground text-sm font-semibold">
            Interview stages
          </h3>
          <p className="text-muted-foreground text-xs">
            Resume is always included. Add optional AI interviews or a custom
            questions form for this role.
          </p>
        </div>

        <div className="space-y-2">
          {APPLICATION_STAGE_OPTIONS.map((stage) => {
            const enabled = stage.locked || selectedStageIds.has(stage.id);
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
                  onCheckedChange={(checked) => toggleStage(stage.id, checked)}
                />
              </label>
            );
          })}
        </div>

        {selectedStageIds.has("custom-questions") ? (
          <div className="border-border border px-4 py-4">
            <CustomQuestionsBuilder
              questions={values.customQuestions ?? []}
              disabled={loading}
              onChange={(customQuestions) =>
                setValues((prev) => ({ ...prev, customQuestions }))
              }
            />
          </div>
        ) : null}
      </section>

      {hideActions ? null : (
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
            {loading ? "Submitting…" : "Submit for review"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            className="w-full sm:w-auto"
            onClick={() => (onCancel ? onCancel() : router.back())}
          >
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}
