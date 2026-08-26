"use client";

import { CheckIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CountryStateCityFields } from "@/components/geo/place-fields";
import {
  ContactFields,
  DocumentSlot,
  FieldInput,
  SectionCard,
} from "@/components/hire/onboarding/fields";
import { AppPage } from "@/components/layout/app-page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPANY_DOC_MAX_BYTES, COMPANY_DOC_MAX_MB } from "@/lib/blob/pathname";
import { uploadBlob } from "@/lib/blob/client/upload";
import {
  GCC_RULE_KEYS,
  GCC_RULE_LABELS,
  type GccRuleKey,
  getMissingOnboardingFields,
  HIRE_ONBOARDING_CONTACT_KEYS,
  HIRE_ONBOARDING_CONTACT_LABELS,
  type HireOnboardingData,
  type HireOnboardingDocument,
  type HireOnboardingLicence,
  isHireOnboardingComplete,
  isHireOnboardingEditable,
  LEGAL_LICENCE_TYPES,
  type LegalLicenceType,
  toHireOnboardingSave,
} from "@/lib/hire/onboarding/types";
import { cn } from "@/lib/utils";

const AUTOSAVE_DEBOUNCE_MS = 700;

function parseCount(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function parseYear(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1800 && n <= 2100 ? n : null;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "document";
}

export function HireOnboardingForm({
  initial,
}: {
  initial: HireOnboardingData;
}) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const dataRef = useRef(data);
  const lastSavedJsonRef = useRef(
    JSON.stringify(toHireOnboardingSave(initial)),
  );
  const saveRequestIdRef = useRef(0);

  dataRef.current = data;

  const editable = isHireOnboardingEditable(data.status);
  const missing = getMissingOnboardingFields(data);
  const complete = isHireOnboardingComplete(data);

  useEffect(() => {
    if (!editable) return;
    const json = JSON.stringify(toHireOnboardingSave(data));
    if (json === lastSavedJsonRef.current) return;

    setSaved(false);
    const timer = window.setTimeout(() => {
      const requestId = ++saveRequestIdRef.current;
      const current = dataRef.current;
      const bodyJson = JSON.stringify(toHireOnboardingSave(current));
      if (bodyJson === lastSavedJsonRef.current) return;

      setSaving(true);
      setError("");
      void (async () => {
        try {
          const res = await fetch("/api/hire/onboarding", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: bodyJson,
          });
          const jsonRes = (await res.json().catch(() => ({}))) as {
            item?: HireOnboardingData;
            error?: string;
          };
          if (requestId !== saveRequestIdRef.current) return;
          if (!res.ok || !jsonRes.item) {
            throw new Error(jsonRes.error || "Save failed");
          }
          lastSavedJsonRef.current = JSON.stringify(
            toHireOnboardingSave(jsonRes.item),
          );
          setData(jsonRes.item);
          setSaved(true);
        } catch (e) {
          if (requestId !== saveRequestIdRef.current) return;
          setError(e instanceof Error ? e.message : "Save failed");
          setSaved(false);
        } finally {
          if (requestId === saveRequestIdRef.current) setSaving(false);
        }
      })();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [data, editable]);

  useEffect(() => {
    return () => {
      const current = dataRef.current;
      if (!isHireOnboardingEditable(current.status)) return;
      const bodyJson = JSON.stringify(toHireOnboardingSave(current));
      if (bodyJson === lastSavedJsonRef.current) return;
      void fetch("/api/hire/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: bodyJson,
        keepalive: true,
      });
    };
  }, []);

  const patch = (updater: (prev: HireOnboardingData) => HireOnboardingData) => {
    setData((prev) => updater(prev));
  };

  async function uploadCompanyFile(kind: string, file: File) {
    if (file.size > COMPANY_DOC_MAX_BYTES) {
      throw new Error(
        `Each document must be ${COMPANY_DOC_MAX_MB} MB or smaller`,
      );
    }
    const result = await uploadBlob({
      file,
      pathname: `users/${data.userId}/company/${kind}/${Date.now()}-${safeFilename(file.name)}`,
      contentType: file.type || "application/pdf",
      maxBytes: COMPANY_DOC_MAX_BYTES,
    });
    const uploaded: HireOnboardingDocument = {
      url: result.url,
      pathname: result.pathname,
      filename: file.name,
      contentType: file.type || "application/pdf",
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    return uploaded;
  }

  async function handleIdentityDoc(
    key: "establishmentCard" | "immigrationFile",
    file: File,
  ) {
    setUploadingKey(key);
    setError("");
    try {
      const uploaded = await uploadCompanyFile(key, file);
      patch((prev) => ({
        ...prev,
        documents: { ...prev.documents, [key]: uploaded },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleLicenceDoc(licenceId: string, file: File) {
    setUploadingKey(`licence-${licenceId}`);
    setError("");
    try {
      const uploaded = await uploadCompanyFile(`licence/${licenceId}`, file);
      patch((prev) => ({
        ...prev,
        legalLicences: prev.legalLicences.map((row) =>
          row.id === licenceId ? { ...row, document: uploaded } : row,
        ),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  }

  async function submit() {
    if (!complete) return;
    setSubmitting(true);
    setError("");
    try {
      const bodyJson = JSON.stringify(toHireOnboardingSave(data));
      const saveRes = await fetch("/api/hire/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: bodyJson,
      });
      const savedJson = (await saveRes.json().catch(() => ({}))) as {
        item?: HireOnboardingData;
        error?: string;
      };
      if (!saveRes.ok || !savedJson.item) {
        throw new Error(savedJson.error || "Save failed");
      }

      const res = await fetch("/api/hire/onboarding/submit", {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        item?: HireOnboardingData;
        error?: string;
      };
      if (!res.ok || !json.item) {
        throw new Error(json.error || "Submit failed");
      }
      setData(json.item);
      lastSavedJsonRef.current = JSON.stringify(
        toHireOnboardingSave(json.item),
      );
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const identity = data.identity;
  const location = data.location;
  const contacts = data.contacts;
  const gcc = data.gccRules;
  const sponsor = data.sponsorshipLicence;
  const used = sponsor.usedSlots ?? 0;
  const limit = sponsor.workerLimit ?? 0;
  const usedPct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <AppPage>
      <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
            Company onboarding
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Company identity, workforce, contacts, licences, and documents.
            Changes autosave. Each file is max {COMPANY_DOC_MAX_MB} MB.
          </p>
        </div>
        <p className="text-muted-foreground text-xs tabular-nums">
          {saving
            ? "Saving…"
            : saved
              ? "Saved"
              : editable
                ? "Editing"
                : "Locked"}
        </p>
      </div>

      {data.status === "submitted" ? (
        <div className="border-border bg-muted/40 mb-6 border px-4 py-3 text-sm">
          <p className="text-foreground font-medium">
            Submitted for final verification.
          </p>
          <p className="text-muted-foreground mt-1">
            An admin will review this pack. You cannot edit until a decision is
            made.
          </p>
        </div>
      ) : null}
      {data.status === "rejected" ? (
        <div className="border-destructive/40 bg-destructive/5 mb-6 border px-4 py-3 text-sm">
          <p className="text-foreground font-medium">Changes required</p>
          {data.adminNote ? (
            <p className="text-foreground mt-1 whitespace-pre-wrap">
              {data.adminNote}
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">
              Update the pack and submit again.
            </p>
          )}
        </div>
      ) : null}

      {error ? <p className="text-destructive mb-4 text-sm">{error}</p> : null}

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Company identity"
            description="Legal registration details. Company name, website, country, industry, and primary contact from your access request cannot be changed."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Legal name"
                value={identity.legalName}
                disabled
              />
              <FieldInput
                label="Trade name"
                value={identity.tradeName}
                disabled={!editable}
                onChange={(tradeName) =>
                  patch((p) => ({
                    ...p,
                    identity: { ...p.identity, tradeName },
                  }))
                }
              />
              <FieldInput
                label="Registration number"
                value={identity.registrationNumber}
                disabled={!editable}
                onChange={(registrationNumber) =>
                  patch((p) => ({
                    ...p,
                    identity: { ...p.identity, registrationNumber },
                  }))
                }
              />
              <FieldInput
                label="Tax / VAT ID"
                value={identity.taxVatId}
                disabled={!editable}
                onChange={(taxVatId) =>
                  patch((p) => ({
                    ...p,
                    identity: { ...p.identity, taxVatId },
                  }))
                }
              />
              <FieldInput
                label="Chamber ID"
                value={identity.chamberId}
                disabled={!editable}
                onChange={(chamberId) =>
                  patch((p) => ({
                    ...p,
                    identity: { ...p.identity, chamberId },
                  }))
                }
              />
              <FieldInput
                label="Sponsor ID"
                value={identity.sponsorId}
                disabled={!editable}
                onChange={(sponsorId) =>
                  patch((p) => ({
                    ...p,
                    identity: { ...p.identity, sponsorId },
                  }))
                }
              />
              <FieldInput
                label="Year established"
                type="number"
                value={identity.yearEstablished?.toString() ?? ""}
                disabled={!editable}
                onChange={(raw) =>
                  patch((p) => ({
                    ...p,
                    identity: {
                      ...p.identity,
                      yearEstablished: parseYear(raw),
                    },
                  }))
                }
              />
              <FieldInput label="Website" value={identity.website} disabled />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DocumentSlot
                label="Establishment card"
                document={data.documents.establishmentCard}
                disabled={!editable}
                uploading={uploadingKey === "establishmentCard"}
                onPick={(file) =>
                  void handleIdentityDoc("establishmentCard", file)
                }
              />
              <DocumentSlot
                label="Immigration file"
                document={data.documents.immigrationFile}
                disabled={!editable}
                uploading={uploadingKey === "immigrationFile"}
                onPick={(file) =>
                  void handleIdentityDoc("immigrationFile", file)
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Location & size"
            description="HQ footprint and workforce mix."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CountryStateCityFields
                countryCode={location.countryCode}
                stateCode={location.stateCode}
                city={location.city}
                disabled={!editable}
                lockCountry
                onChange={({ countryCode, stateCode, city }) =>
                  patch((p) => ({
                    ...p,
                    location: {
                      ...p.location,
                      countryCode,
                      stateCode,
                      city,
                    },
                  }))
                }
              />
              <div className="sm:col-span-2">
                <FieldInput
                  label="Address"
                  value={location.address}
                  disabled={!editable}
                  onChange={(address) =>
                    patch((p) => ({
                      ...p,
                      location: { ...p.location, address },
                    }))
                  }
                />
              </div>
              <FieldInput
                label="Industry / sector"
                value={location.industry ?? ""}
                disabled
              />
              <FieldInput
                label="Total employees"
                type="number"
                value={location.totalEmployees?.toString() ?? ""}
                disabled={!editable}
                onChange={(raw) =>
                  patch((p) => ({
                    ...p,
                    location: {
                      ...p.location,
                      totalEmployees: parseCount(raw),
                    },
                  }))
                }
              />
              <FieldInput
                label="Foreign workers"
                type="number"
                value={location.foreignWorkers?.toString() ?? ""}
                disabled={!editable}
                onChange={(raw) =>
                  patch((p) => ({
                    ...p,
                    location: {
                      ...p.location,
                      foreignWorkers: parseCount(raw),
                    },
                  }))
                }
              />
              <FieldInput
                label="National employees"
                type="number"
                value={location.nationalEmployees?.toString() ?? ""}
                disabled={!editable}
                onChange={(raw) =>
                  patch((p) => ({
                    ...p,
                    location: {
                      ...p.location,
                      nationalEmployees: parseCount(raw),
                    },
                  }))
                }
              />
              <FieldInput
                label="Blue collar workers"
                type="number"
                value={location.blueCollarCount?.toString() ?? ""}
                disabled={!editable}
                onChange={(raw) =>
                  patch((p) => ({
                    ...p,
                    location: {
                      ...p.location,
                      blueCollarCount: parseCount(raw),
                    },
                  }))
                }
              />
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Key contacts"
          description="People we can reach for operations and compliance."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {HIRE_ONBOARDING_CONTACT_KEYS.map((key) => (
              <div key={key} className="border-border border p-3">
                <p className="text-foreground mb-3 text-sm font-medium">
                  {HIRE_ONBOARDING_CONTACT_LABELS[key]}
                  {key === "owner" ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      (name, phone, email locked from access request)
                    </span>
                  ) : null}
                </p>
                <ContactFields
                  value={contacts[key]}
                  disabled={!editable}
                  lockIdentity={key === "owner"}
                  defaultIso={location.countryCode || "IN"}
                  onChange={(next) =>
                    patch((p) => ({
                      ...p,
                      contacts: { ...p.contacts, [key]: next },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Sponsorship licence"
          description="Quota against the establishment / kafala file."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldInput
              label="Type"
              value={sponsor.type}
              disabled={!editable}
              placeholder="UAE Establishment Card"
              onChange={(type) =>
                patch((p) => ({
                  ...p,
                  sponsorshipLicence: { ...p.sponsorshipLicence, type },
                }))
              }
            />
            <FieldInput
              label="Number"
              value={sponsor.number}
              disabled={!editable}
              onChange={(number) =>
                patch((p) => ({
                  ...p,
                  sponsorshipLicence: { ...p.sponsorshipLicence, number },
                }))
              }
            />
            <FieldInput
              label="Category"
              value={sponsor.category}
              disabled={!editable}
              placeholder="Kafala"
              onChange={(category) =>
                patch((p) => ({
                  ...p,
                  sponsorshipLicence: { ...p.sponsorshipLicence, category },
                }))
              }
            />
            <FieldInput
              label="Worker limit"
              type="number"
              value={sponsor.workerLimit?.toString() ?? ""}
              disabled={!editable}
              onChange={(raw) =>
                patch((p) => ({
                  ...p,
                  sponsorshipLicence: {
                    ...p.sponsorshipLicence,
                    workerLimit: parseCount(raw),
                  },
                }))
              }
            />
            <FieldInput
              label="Used slots"
              type="number"
              value={sponsor.usedSlots?.toString() ?? ""}
              disabled={!editable}
              onChange={(raw) =>
                patch((p) => ({
                  ...p,
                  sponsorshipLicence: {
                    ...p.sponsorshipLicence,
                    usedSlots: parseCount(raw),
                  },
                }))
              }
            />
            <FieldInput
              label="Expiry"
              type="date"
              value={sponsor.expiry}
              disabled={!editable}
              onChange={(expiry) =>
                patch((p) => ({
                  ...p,
                  sponsorshipLicence: { ...p.sponsorshipLicence, expiry },
                }))
              }
            />
          </div>
          {limit > 0 ? (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Used slots</span>
                <span className="tabular-nums">
                  {used} / {limit}
                </span>
              </div>
              <div className="bg-muted h-2 w-full overflow-hidden">
                <div
                  className="bg-primary h-full"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Legal licences">
          <div className="mb-4 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!editable}
              onClick={() =>
                patch((p) => ({
                  ...p,
                  legalLicences: [
                    ...p.legalLicences,
                    {
                      id: crypto.randomUUID(),
                      type: "Commercial License",
                      number: "",
                      issuedAt: "",
                      expiryAt: "",
                      document: null,
                    } satisfies HireOnboardingLicence,
                  ],
                }))
              }
            >
              <PlusIcon className="size-3.5" />
              Add licence
            </Button>
          </div>
          {data.legalLicences.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No licences added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.legalLicences.map((row) => (
                <div
                  key={row.id}
                  className="border-border grid gap-3 border p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Licence
                    </Label>
                    <Select
                      value={row.type}
                      disabled={!editable}
                      onValueChange={(value) =>
                        patch((p) => ({
                          ...p,
                          legalLicences: p.legalLicences.map((item) =>
                            item.id === row.id
                              ? { ...item, type: value as LegalLicenceType }
                              : item,
                          ),
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEGAL_LICENCE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldInput
                    label="Number"
                    value={row.number}
                    disabled={!editable}
                    onChange={(number) =>
                      patch((p) => ({
                        ...p,
                        legalLicences: p.legalLicences.map((item) =>
                          item.id === row.id ? { ...item, number } : item,
                        ),
                      }))
                    }
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!editable}
                      aria-label="Remove licence"
                      onClick={() =>
                        patch((p) => ({
                          ...p,
                          legalLicences: p.legalLicences.filter(
                            (item) => item.id !== row.id,
                          ),
                        }))
                      }
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                  <FieldInput
                    label="Issued"
                    type="date"
                    value={row.issuedAt}
                    disabled={!editable}
                    onChange={(issuedAt) =>
                      patch((p) => ({
                        ...p,
                        legalLicences: p.legalLicences.map((item) =>
                          item.id === row.id ? { ...item, issuedAt } : item,
                        ),
                      }))
                    }
                  />
                  <FieldInput
                    label="Expiry"
                    type="date"
                    value={row.expiryAt}
                    disabled={!editable}
                    onChange={(expiryAt) =>
                      patch((p) => ({
                        ...p,
                        legalLicences: p.legalLicences.map((item) =>
                          item.id === row.id ? { ...item, expiryAt } : item,
                        ),
                      }))
                    }
                  />
                  <DocumentSlot
                    label="Scan"
                    document={row.document}
                    disabled={!editable}
                    uploading={uploadingKey === `licence-${row.id}`}
                    onPick={(file) => void handleLicenceDoc(row.id, file)}
                  />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Country rules — GCC regime"
          description="Confirm each item before submitting for verification."
        >
          <div className="space-y-2">
            {GCC_RULE_KEYS.map((key: GccRuleKey) => {
              const on = gcc[key];
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!editable}
                  onClick={() =>
                    patch((p) => ({
                      ...p,
                      gccRules: { ...p.gccRules, [key]: !p.gccRules[key] },
                    }))
                  }
                  className={cn(
                    "border-border flex w-full items-center gap-3 border px-3 py-2.5 text-left text-sm",
                    editable && "hover:bg-muted/40",
                    !editable && "opacity-70",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center border",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {on ? <CheckIcon className="size-3" /> : null}
                  </span>
                  {GCC_RULE_LABELS[key]}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {editable ? (
          <div className="border-border bg-card border p-4 sm:p-6">
            <h2 className="text-foreground text-lg font-semibold">
              Submit for final verification
            </h2>
            <p className="text-muted-foreground mt-1 mb-4 text-sm">
              Required fields must be complete. After submit, this pack is
              locked until an admin verifies or sends it back.
            </p>
            {!complete ? (
              <p className="text-muted-foreground mb-4 text-sm">
                Still missing: {missing.join(", ")}.
              </p>
            ) : null}
            <Button
              type="button"
              disabled={!complete || submitting || saving}
              onClick={() => void submit()}
            >
              {submitting ? "Submitting…" : "Submit for Final Verification"}
            </Button>
          </div>
        ) : null}
      </div>
    </AppPage>
  );
}
