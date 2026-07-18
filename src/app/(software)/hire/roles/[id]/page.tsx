"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ApplicantSheet } from "@/components/hire/applicant-sheet";
import { RoleSheet } from "@/components/hire/role-sheet";
import type {
  ApplicantInterviewScore,
  ApplicantListItem,
  PaginatedApplicantsResponse,
} from "@/lib/jobs/applications";
import type { InterviewStageId } from "@/lib/interviews";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

const SCORE_FILTERS = [
  { value: "all", label: "All scores" },
  { value: "any", label: "Completed" },
  { value: "none", label: "Not taken" },
  { value: "min:7", label: "7+ overall" },
  { value: "min:8", label: "8+ overall" },
  { value: "min:9", label: "9+ overall" },
] as const;

function initialsFor(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");
  return (letters.join("") || source[0] || "?").toUpperCase();
}

function scoreFor(
  interviews: ApplicantInterviewScore[],
  stageId: InterviewStageId,
): number | null {
  const hit = interviews.find((i) => i.stageId === stageId);
  if (!hit || hit.status !== "completed") return null;
  return hit.overall;
}

function ScoreCell({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return (
    <span className="text-foreground text-sm font-medium tabular-nums">
      {value}
      <span className="text-muted-foreground font-normal">/10</span>
    </span>
  );
}

export default function RoleCandidatesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ApplicantListItem[]>([]);
  const [job, setJob] = useState<PaginatedApplicantsResponse["job"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [communicationFilter, setCommunicationFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [pageCount, setPageCount] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(
    null,
  );

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const searchParams = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) searchParams.set("search", search.trim());
      if (statusFilter !== "all") searchParams.set("status", statusFilter);
      if (communicationFilter !== "all") {
        searchParams.set("communication", communicationFilter);
      }
      if (domainFilter !== "all") {
        searchParams.set("domain", domainFilter);
      }

      const res = await fetch(
        `/api/jobs/${params.id}/applications?${searchParams.toString()}`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load candidates");
      const payload = json as PaginatedApplicantsResponse;
      setData(payload.items);
      setJob(payload.job);
      setPageCount(payload.pageCount);
      setTotalItems(payload.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load candidates");
      setData([]);
      setPageCount(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [
    params.id,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    statusFilter,
    communicationFilter,
    domainFilter,
  ]);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        void fetchApplicants();
      },
      search ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [fetchApplicants, search]);

  const resetPage = () =>
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));

  const columns = useMemo<ColumnDef<ApplicantListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Candidate",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size="sm">
              {row.original.image ? (
                <AvatarImage src={row.original.image} alt="" />
              ) : null}
              <AvatarFallback>
                {initialsFor(row.original.name, row.original.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="text-foreground truncate font-medium">
                  {row.original.name ?? "Candidate"}
                </p>
                {row.original.kycVerified ? (
                  <Badge className="shrink-0 font-normal">AI KYC Done</Badge>
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
        id: "communication",
        header: "Communication",
        cell: ({ row }) => (
          <ScoreCell
            value={scoreFor(row.original.interviews, "ai-communication")}
          />
        ),
      },
      {
        id: "domain",
        header: "Domain",
        cell: ({ row }) => (
          <ScoreCell value={scoreFor(row.original.interviews, "ai-domain")} />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "appliedAt",
        header: "Applied",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {new Date(row.original.appliedAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => router.push("/hire/roles")}
      >
        <ArrowLeftIcon className="size-4" />
        <span className="hidden sm:inline">Back to roles</span>
      </Button>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {job ? (
              <Badge className="capitalize">{job.status}</Badge>
            ) : null}
          </div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight break-words sm:text-2xl md:text-3xl">
            {job?.title ?? "Candidates"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {totalItems}{" "}
            {totalItems === 1 ? "candidate matches" : "candidates match"} these
            filters. Click a row to open profile and interview scores.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => setRoleSheetOpen(true)}
        >
          <PencilIcon className="size-4" />
          Edit role
        </Button>
      </div>

      {error ? (
        <div className="border-destructive/20 bg-destructive/10 text-destructive mb-6 rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

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
          resetPage();
        }}
        searchPlaceholder="Search name or email…"
        totalItems={totalItems}
        onRowClick={(row) => setSelectedApplicantId(row.applicantId)}
        rightActions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={communicationFilter}
              onValueChange={(value) => {
                setCommunicationFilter(value);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Communication" />
              </SelectTrigger>
              <SelectContent>
                {SCORE_FILTERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    Comm · {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={domainFilter}
              onValueChange={(value) => {
                setDomainFilter(value);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                {SCORE_FILTERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    Domain · {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <ApplicantSheet
        jobId={params.id}
        applicantId={selectedApplicantId}
        open={Boolean(selectedApplicantId)}
        onOpenChange={(open) => {
          if (!open) setSelectedApplicantId(null);
        }}
        onStatusChanged={(applicantId, status) => {
          setData((prev) =>
            prev.map((row) =>
              row.applicantId === applicantId ? { ...row, status } : row,
            ),
          );
        }}
      />

      <RoleSheet
        jobId={params.id}
        open={roleSheetOpen}
        onOpenChange={setRoleSheetOpen}
        onChanged={() => void fetchApplicants()}
      />
    </div>
  );
}
