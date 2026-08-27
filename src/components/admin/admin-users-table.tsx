"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, PlusIcon, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
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
import {
  cancelAdminInviteAction,
  listAdminUsersAction,
  provisionAdminUserAction,
} from "@/lib/admin/actions";
import { getProfileIdLabel } from "@/lib/user/profile-types";

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AdminUsersTable({
  type,
  initialItems,
}: {
  type: "hire" | "admin";
  initialItems: AdminUserListItem[];
}) {
  const [data, setData] = useState<AdminUserListItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
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
      const result = await listAdminUsersAction(type);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setData(result.items);
    } catch {
      toast.error("Could not refresh list");
    } finally {
      setLoading(false);
    }
  }, [type]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await provisionAdminUserAction({
        email: email.trim(),
        profileType: type,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAddOpen(false);
      setEmail("");
      toast.success(
        result.created
          ? `${roleLabel} invite saved — they’ll get access on Corporate Login (Google)`
          : `Updated to ${roleLabel.toLowerCase()}`,
      );
      await load();
    } catch {
      setError("Could not add user");
    } finally {
      setSaving(false);
    }
  }

  async function cancelInvite(user: AdminUserListItem) {
    if (!user.pending) return;
    setRowBusyId(user.id);
    try {
      const result = await cancelAdminInviteAction({ email: user.email });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setData((prev) => prev.filter((row) => row.id !== user.id));
      toast.success("Invite cancelled");
    } catch {
      toast.error("Could not cancel invite");
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
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-foreground truncate text-sm font-medium">
                {row.original.name ||
                  (row.original.pending ? "Pending invite" : "Unnamed")}
              </p>
              {row.original.pending ? (
                <span className="text-muted-foreground border-border shrink-0 border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                  Pending
                </span>
              ) : null}
            </div>
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
          {row.original.pending
            ? "Not signed in"
            : row.original.createdAt
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
        if (!row.original.pending) return null;
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
                  onSelect={() => void cancelInvite(row.original)}
                >
                  <UserRound className="size-4" />
                  Cancel invite
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
                Enter an email. If they already have an account, their role
                becomes {roleLabel.toLowerCase()}. If not, an invite is queued
                and applied on their first Corporate Login (Google).
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
