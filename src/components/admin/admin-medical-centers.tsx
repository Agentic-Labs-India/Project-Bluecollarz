"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PenSquareIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { MedicalDateField } from "@/components/admin/medical-date-field";
import { CountryStateCityFields } from "@/components/geo/place-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  DEFAULT_OPERATING_DAYS,
  MEDICAL_CLOCK_TIMES,
  MEDICAL_WEEKDAY_SHORT,
  minutesFromHm,
} from "@/lib/medical/time";
import type { MedicalCenterListItem } from "@/lib/medical/types";

type Editor = {
  id: string | null;
  name: string;
  licenseNumber: string;
  licenseAuthority: string;
  licenseExpiry: string;
  address: string;
  countryCode: string | null;
  stateCode: string | null;
  city: string;
  phone: string;
  email: string;
  mapsUrl: string;
  notes: string;
  operatingDays: number[];
  openTime: string;
  closeTime: string;
  active: boolean;
};

const emptyEditor = (): Editor => ({
  id: null,
  name: "",
  licenseNumber: "",
  licenseAuthority: "",
  licenseExpiry: "",
  address: "",
  countryCode: "IN",
  stateCode: null,
  city: "",
  phone: "",
  email: "",
  mapsUrl: "",
  notes: "",
  operatingDays: [...DEFAULT_OPERATING_DAYS],
  openTime: DEFAULT_OPEN_TIME,
  closeTime: DEFAULT_CLOSE_TIME,
  active: true,
});

function fromItem(item: MedicalCenterListItem): Editor {
  return {
    id: item.id,
    name: item.name,
    licenseNumber: item.licenseNumber,
    licenseAuthority: item.licenseAuthority ?? "",
    licenseExpiry: item.licenseExpiry ?? "",
    address: item.address,
    countryCode: item.countryCode,
    stateCode: item.stateCode,
    city: item.city,
    phone: item.phone ?? "",
    email: item.email ?? "",
    mapsUrl: item.mapsUrl ?? "",
    notes: item.notes ?? "",
    operatingDays: item.hours.days,
    openTime: item.hours.open,
    closeTime: item.hours.close,
    active: item.active,
  };
}

export function AdminMedicalCenters({
  centers,
  loading,
  onChanged,
}: {
  centers: MedicalCenterListItem[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const [saving, setSaving] = useState(false);

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this medical center?")) return;
      try {
        const res = await fetch("/api/admin/medical/centers", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          toast.error(json.error || "Could not delete center");
          return;
        }
        toast.success("Center deleted");
        onChanged();
      } catch {
        toast.error("Could not delete center");
      }
    },
    [onChanged],
  );

  const columns = useMemo<ColumnDef<MedicalCenterListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Center",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-foreground truncate font-medium">
              {row.original.name}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {row.original.city}
              {row.original.placeLabel ? ` · ${row.original.placeLabel}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "licenseNumber",
        header: "License",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate">{row.original.licenseNumber}</p>
            <p className="text-muted-foreground truncate text-xs">
              {row.original.licenseAuthority || "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "hoursLabel",
        header: "Hours",
        cell: ({ row }) => (
          <p className="text-muted-foreground max-w-48 truncate text-xs">
            {row.original.hoursLabel}
          </p>
        ),
      },
      {
        accessorKey: "active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.active ? "default" : "outline"}>
            {row.original.active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setEditor(fromItem(row.original));
                setOpen(true);
              }}
              aria-label="Edit center"
            >
              <PenSquareIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                void remove(row.original.id);
              }}
              aria-label="Delete center"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [remove],
  );

  async function save() {
    if (
      !editor.name.trim() ||
      !editor.licenseNumber.trim() ||
      !editor.address.trim() ||
      !editor.countryCode ||
      !editor.city.trim()
    ) {
      toast.error("Name, license, address, country, and city are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editor.name.trim(),
        licenseNumber: editor.licenseNumber.trim(),
        licenseAuthority: editor.licenseAuthority.trim() || undefined,
        licenseExpiry: editor.licenseExpiry || undefined,
        address: editor.address.trim(),
        countryCode: editor.countryCode,
        stateCode: editor.stateCode,
        city: editor.city.trim(),
        phone: editor.phone.trim() || undefined,
        email: editor.email.trim() || undefined,
        mapsUrl: editor.mapsUrl.trim() || undefined,
        notes: editor.notes.trim() || undefined,
        operatingDays: editor.operatingDays,
        openTime: editor.openTime,
        closeTime: editor.closeTime,
        active: editor.active,
      };
      const res = await fetch("/api/admin/medical/centers", {
        method: editor.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editor.id ? { id: editor.id, ...payload } : payload,
        ),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Could not save center");
        return;
      }
      toast.success(editor.id ? "Center updated" : "Center created");
      setOpen(false);
      onChanged();
    } catch {
      toast.error("Could not save center");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={centers}
        loading={loading}
        searchKey="name"
        searchPlaceholder="Search centers"
        onRowClick={(row) => {
          setEditor(fromItem(row));
          setOpen(true);
        }}
        rightActions={
          <Button
            type="button"
            onClick={() => {
              setEditor(emptyEditor());
              setOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            Add center
          </Button>
        }
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-2xl!"
          onPointerDownOutside={(event) => {
            const node = event.target;
            if (
              node instanceof Element &&
              node.closest("[data-slot=combobox-content]")
            ) {
              event.preventDefault();
            }
          }}
          onFocusOutside={(event) => {
            const node = event.target;
            if (
              node instanceof Element &&
              node.closest("[data-slot=combobox-content]")
            ) {
              event.preventDefault();
            }
          }}
        >
          <SheetHeader>
            <SheetTitle>
              {editor.id ? "Edit medical center" : "New medical center"}
            </SheetTitle>
            <SheetDescription>
              License, address, hours, and contact. Hours control which days and
              times candidates can book.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2">
            <Field label="Center name">
              <Input
                value={editor.name}
                onChange={(event) =>
                  setEditor((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="License number">
                <Input
                  value={editor.licenseNumber}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      licenseNumber: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Licensing authority">
                <Input
                  value={editor.licenseAuthority}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      licenseAuthority: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="License expiry">
              <MedicalDateField
                value={editor.licenseExpiry}
                onChange={(licenseExpiry) =>
                  setEditor((prev) => ({ ...prev, licenseExpiry }))
                }
                placeholder="Optional"
              />
            </Field>
            <Field label="Address">
              <Textarea
                value={editor.address}
                onChange={(event) =>
                  setEditor((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
              />
            </Field>
            <CountryStateCityFields
              countryCode={editor.countryCode}
              stateCode={editor.stateCode}
              city={editor.city}
              onChange={(next) =>
                setEditor((prev) => ({
                  ...prev,
                  countryCode: next.countryCode,
                  stateCode: next.stateCode,
                  city: next.city,
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <Input
                  value={editor.phone}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={editor.email}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Maps URL">
              <Input
                value={editor.mapsUrl}
                onChange={(event) =>
                  setEditor((prev) => ({
                    ...prev,
                    mapsUrl: event.target.value,
                  }))
                }
                placeholder="https://maps.google.com/…"
              />
            </Field>
            <Field label="Notes">
              <Textarea
                value={editor.notes}
                onChange={(event) =>
                  setEditor((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Operating days">
              <div className="flex flex-wrap gap-1.5">
                {MEDICAL_WEEKDAY_SHORT.map((label, day) => {
                  const on = editor.operatingDays.includes(day);
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() =>
                        setEditor((prev) => {
                          const next = on
                            ? prev.operatingDays.filter(
                                (value) => value !== day,
                              )
                            : [...prev.operatingDays, day].sort(
                                (a, b) => a - b,
                              );
                          if (!next.length) return prev;
                          return { ...prev, operatingDays: next };
                        })
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Opens">
                <Select
                  value={editor.openTime}
                  onValueChange={(openTime) =>
                    setEditor((prev) => ({
                      ...prev,
                      openTime,
                      closeTime:
                        minutesFromHm(openTime) + 30 >
                        minutesFromHm(prev.closeTime)
                          ? (MEDICAL_CLOCK_TIMES.find(
                              (slot) =>
                                minutesFromHm(slot) >=
                                minutesFromHm(openTime) + 30,
                            ) ?? prev.closeTime)
                          : prev.closeTime,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {MEDICAL_CLOCK_TIMES.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Closes">
                <Select
                  value={editor.closeTime}
                  onValueChange={(closeTime) =>
                    setEditor((prev) => ({ ...prev, closeTime }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {MEDICAL_CLOCK_TIMES.filter(
                      (slot) =>
                        minutesFromHm(slot) >=
                        minutesFromHm(editor.openTime) + 30,
                    ).map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex items-center justify-between border border-border px-3 py-2">
              <Label htmlFor="center-active">Active</Label>
              <Switch
                id="center-active"
                checked={editor.active}
                onCheckedChange={(active) =>
                  setEditor((prev) => ({ ...prev, active }))
                }
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : editor.id ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}
