"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  dialCodeForIso,
  isoForDialCode,
  listDialCodes,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

/** Country calling code + national number — both stored as numbers. */
export function PhoneNumberInput({
  countryCode,
  number,
  onChange,
  defaultIso = "IN",
  id,
  disabled,
  className,
}: {
  countryCode: number | null;
  number: number | null;
  onChange: (next: {
    phoneCountryCode: number | null;
    phoneNumber: number | null;
  }) => void;
  defaultIso?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const options = useMemo(() => listDialCodes(), []);
  const lastKeyRef = useRef(`${countryCode}|${number}`);

  const [isoDraft, setIsoDraft] = useState(() =>
    isoForDialCode(countryCode, defaultIso),
  );
  const [nationalDraft, setNationalDraft] = useState(() =>
    number === null ? "" : String(number),
  );

  useEffect(() => {
    const key = `${countryCode}|${number}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    setIsoDraft(isoForDialCode(countryCode, defaultIso));
    setNationalDraft(number === null ? "" : String(number));
  }, [countryCode, number, defaultIso]);

  const emit = (iso: string, nationalRaw: string) => {
    const dial = dialCodeForIso(iso)?.dialCode ?? null;
    const digits = nationalRaw.replace(/\D/g, "");
    const phoneNumber =
      digits && Number.isFinite(Number(digits)) ? Number(digits) : null;
    lastKeyRef.current = `${dial}|${phoneNumber}`;
    onChange({ phoneCountryCode: dial, phoneNumber });
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={isoDraft}
        disabled={disabled}
        onValueChange={(iso) => {
          if (!iso) return;
          setIsoDraft(iso);
          emit(iso, nationalDraft);
        }}
      >
        <SelectTrigger
          className="w-[8.25rem] shrink-0"
          aria-label="Country calling code"
        >
          <SelectValue placeholder="Code" />
        </SelectTrigger>
        <SelectContent className="max-h-72 min-w-[16rem]">
          {options.map((opt) => (
            <SelectItem
              key={opt.isoCode}
              value={opt.isoCode}
              textValue={`${opt.name} +${opt.dialCode}`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span aria-hidden>{opt.flag}</span>
                <span className="tabular-nums">+{opt.dialCode}</span>
                <span className="text-muted-foreground truncate">
                  {opt.name}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        placeholder="Phone number"
        value={nationalDraft}
        className="min-w-0 flex-1"
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "");
          setNationalDraft(next);
          emit(isoDraft, next);
        }}
      />
    </div>
  );
}
