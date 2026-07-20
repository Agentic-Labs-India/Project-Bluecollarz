"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
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
} from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Calendar picker; value is `yyyy-MM-dd` (empty when unset). Persists as BSON Date. */
export function DateOfBirthPicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = dateOnlyToLocalDate(value);
  const today = new Date();
  const startMonth = new Date(today.getFullYear() - 100, 0, 1);
  const endMonth = today;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon data-icon="inline-start" />
          {value ? formatDateOnlyDisplay(value) : "Pick date of birth"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected ?? new Date(today.getFullYear() - 25, 0, 1)}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={{ after: today }}
          onSelect={(date) => {
            onChange(date ? formatDateOnly(date) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
