"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RoleSheet } from "@/components/hire/role-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listHireJobsAction } from "@/lib/jobs/actions";
import { JOB_STATUS_LABELS, JOB_STATUSES, type JobListItem } from "@/lib/jobs";

const STATUS_VARIANT: Record<
  JobListItem["status"],
  "default" | "secondary" | "outline"
> = {
  draft: "secondary",
  underVerification: "outline",
  published: "default",
  closed: "outline",
};

export function HireJobsTable() {
  const router = useRouter();
  const [data, setData] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [pageCount, setPageCount] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sheetJobId, setSheetJobId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listHireJobsAction({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (!result.ok) throw new Error(result.error);
      setData(result.items);
      setPageCount(result.pageCount);
      setTotalItems(result.total);
    } catch {
      setData([]);
      setPageCount(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        void fetchJobs();
      },
      search ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [fetchJobs, search]);

  const columns = useMemo<ColumnDef<JobListItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Role",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-foreground truncate font-medium">
              {row.original.title}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {row.original.pay}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "tab",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm capitalize">
            {row.original.tab.replace("-", " ")}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]}>
            {JOB_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "applicantCount",
        header: "Applicants",
        cell: ({ row }) => (
          <span className="text-foreground text-sm tabular-nums">
            {row.original.applicantCount}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {new Date(row.original.updatedAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        meta: {
          headerClassName: "w-12 text-right",
          cellClassName: "w-12 text-right",
        },
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Manage role"
            title="Manage role"
            onClick={(event) => {
              event.stopPropagation();
              setSheetJobId(row.original.id);
              setSheetOpen(true);
            }}
          >
            <EyeIcon className="size-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        manualPagination
        manualFiltering
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
        searchPlaceholder="Search roles..."
        totalItems={totalItems}
        onRowClick={(row) => router.push(`/hire/roles/${row.id}`)}
        rightActions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {JOB_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {JOB_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/hire/roles/new">
                <PlusIcon className="size-4" />
                Post a role
              </Link>
            </Button>
          </div>
        }
      />
      <RoleSheet
        jobId={sheetJobId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onChanged={() => void fetchJobs()}
      />
    </>
  );
}
