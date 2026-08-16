"use client";

import { useRef, type ReactNode } from "react";
import { FileUpIcon } from "lucide-react";
import { CountryCodeSelect } from "@/components/geo/place-fields";
import { PhoneNumberInput } from "@/components/candidate/phone-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPANY_DOC_MAX_MB } from "@/lib/blob/pathname";
import type {
  HireOnboardingContact,
  HireOnboardingDocument,
} from "@/lib/hire/onboarding/types";

export const COMPANY_DOC_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

export function FieldInput({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        readOnly={!onChange}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border/80 bg-card w-full min-w-0 border p-4 shadow-sm sm:p-6">
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-1 mb-5 text-sm">{description}</p>
      ) : (
        <div className="mb-5" />
      )}
      {children}
    </section>
  );
}

export function ContactFields({
  value,
  onChange,
  disabled,
  defaultIso,
  lockIdentity,
}: {
  value: HireOnboardingContact;
  onChange: (next: HireOnboardingContact) => void;
  disabled?: boolean;
  defaultIso: string;
  lockIdentity?: boolean;
}) {
  const frozen = disabled || lockIdentity;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FieldInput
        label="Name"
        value={value.name}
        disabled={frozen}
        onChange={
          lockIdentity ? undefined : (name) => onChange({ ...value, name })
        }
      />
      <CountryCodeSelect
        label="Nationality"
        value={value.nationalityCode}
        disabled={disabled}
        placeholder="Select nationality"
        onChange={(nationalityCode) => onChange({ ...value, nationalityCode })}
      />
      <div className="min-w-0 space-y-1.5 sm:col-span-2">
        <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Phone
        </Label>
        <PhoneNumberInput
          countryCode={value.phoneCountryCode}
          number={value.phoneNumber}
          disabled={frozen}
          defaultIso={defaultIso}
          onChange={({ phoneCountryCode, phoneNumber }) =>
            onChange({ ...value, phoneCountryCode, phoneNumber })
          }
        />
      </div>
      <FieldInput
        label="Email"
        type="email"
        value={value.email}
        disabled={frozen}
        onChange={
          lockIdentity ? undefined : (email) => onChange({ ...value, email })
        }
      />
    </div>
  );
}

export function DocumentSlot({
  label,
  document,
  disabled,
  uploading,
  onPick,
}: {
  label: string;
  document: HireOnboardingDocument | null;
  disabled?: boolean;
  uploading?: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="border-border min-w-0 border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        PDF or image · max {COMPANY_DOC_MAX_MB} MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={COMPANY_DOC_ACCEPT}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <FileUpIcon className="size-3.5" />
          {uploading ? "Uploading…" : document ? "Replace" : "Upload"}
        </Button>
        {document ? (
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary truncate text-xs font-medium underline-offset-4 hover:underline"
          >
            {document.filename}
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">No file yet</span>
        )}
      </div>
    </div>
  );
}
