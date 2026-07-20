"use client";

import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DOB_FORMAT = "MM/dd/yyyy";

function parseDob(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  for (const fmt of [DOB_FORMAT, "yyyy-MM-dd", "dd/MM/yyyy"]) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  const native = new Date(trimmed);
  return isValid(native) ? native : undefined;
}

/** Calendar picker for profile date of birth (stores MM/dd/yyyy). */
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
  const selected = parseDob(value);
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
          {selected ? format(selected, DOB_FORMAT) : "Pick date of birth"}
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
            onChange(date ? format(date, DOB_FORMAT) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
