"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  dateOnlyToLocalDate,
  formatDateOnly,
  formatDateOnlyDisplay,
} from "@/lib/core/dates";
import { cn } from "@/lib/utils";

export function MedicalDateField({
  value,
  onChange,
  id,
  placeholder = "Pick date",
  minDate,
  isDateDisabled,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  placeholder?: string;
  minDate?: string;
  isDateDisabled?: (ymd: string) => boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = dateOnlyToLocalDate(value);
  const min = minDate ? dateOnlyToLocalDate(minDate) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon data-icon="inline-start" />
          {value ? formatDateOnlyDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? min ?? new Date()}
          disabled={[
            ...(min ? [{ before: min }] : []),
            ...(isDateDisabled
              ? [(date: Date) => isDateDisabled(formatDateOnly(date))]
              : []),
          ]}
          onSelect={(date) => {
            onChange(date ? formatDateOnly(date) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
