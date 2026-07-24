"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, PlusIcon, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUserListItem } from "@/lib/admin/queries";
import { getProfileIdLabel } from "@/lib/profile-types";

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AdminUsersTable({
  type,
}: {
  type: "hire" | "admin";
}) {
  const [data, setData] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const roleLabel = getProfileIdLabel(type);
  const addLabel = type === "hire" ? "Add recruiter" : "Add admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?type=${type}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminUserListItem[];
      };
      setData(res.ok ? (json.items ?? []) : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), profileType: type }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        item?: AdminUserListItem;
        created?: boolean;
      };
      if (!res.ok) {
        setError(json.error || "Could not add user");
        return;
      }
      setAddOpen(false);
      setEmail("");
      await load();
    } catch {
      setError("Could not add user");
    } finally {
      setSaving(false);
    }
  }

  async function makeCandidate(user: AdminUserListItem) {
    setRowBusyId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, profileType: "work" }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(json.error || "Could not update user");
        return;
      }
      setData((prev) => prev.filter((row) => row.id !== user.id));
    } catch {
      window.alert("Could not update user");
    } finally {
      setRowBusyId(null);
    }
  }

  const columns: ColumnDef<AdminUserListItem>[] = [
    {
      id: "email",
      accessorFn: (row) => `${row.name ?? ""} ${row.email}`,
      header: "Person",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8">
            {row.original.image ? (
              <AvatarImage src={row.original.image} alt="" />
            ) : null}
            <AvatarFallback className="text-[10px] font-medium">
              {initials(row.original.name, row.original.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">
              {row.original.name || "Unnamed"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {row.original.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      cell: ({ row }) => {
        const busy = rowBusyId === row.original.id;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy}
                  aria-label="Open actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={busy}
                  onSelect={() => void makeCandidate(row.original)}
                >
                  <UserRound className="size-4" />
                  Make candidate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKey="email"
        searchPlaceholder="Search by email…"
        rightActions={
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => {
              setError(null);
              setEmail("");
              setAddOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            {addLabel}
          </Button>
        }
      />

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setError(null);
            setEmail("");
          }
        }}
      >
        <DialogContent>
          <form onSubmit={(e) => void handleAdd(e)}>
            <DialogHeader>
              <DialogTitle>{addLabel}</DialogTitle>
              <DialogDescription>
                Enter an email. If the account exists, its role becomes{" "}
                {roleLabel.toLowerCase()}. If not, a stub account is created
                with that role — they sign in with Google later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="admin-user-email">Email</Label>
              <Input
                id="admin-user-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={saving}
              />
              {error ? (
                <p className="text-destructive text-xs">{error}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !email.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
