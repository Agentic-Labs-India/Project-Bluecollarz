"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Optional per-column layout classes (e.g. narrow ID + wide title columns). */
export type DataTableColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  loading?: boolean;
  rightActions?: React.ReactNode;
  leftActions?: React.ReactNode;
  customSearch?: React.ReactNode;
  /** Hide the search input entirely (e.g. server-driven lists without search). */
  hideSearch?: boolean;
  initialColumnVisibility?: VisibilityState;
  defaultPageSize?: number;
  manualPagination?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  manualFiltering?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  totalItems?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey = "name",
  searchPlaceholder = "Search...",
  onRowClick,
  loading = false,
  rightActions,
  leftActions,
  customSearch,
  hideSearch = false,
  initialColumnVisibility = {},
  defaultPageSize = 10,
  manualPagination,
  pageCount,
  pagination,
  onPaginationChange,
  manualFiltering,
  searchValue,
  onSearchChange,
  totalItems,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = React.useState({});
  /** Stable empty filters — a fresh `[]` each render makes TanStack treat filters as changed and breaks pagination. */
  const noColumnFilters = React.useMemo<ColumnFiltersState>(() => [], []);
  const [clientPagination, setClientPagination] = React.useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const isManualPagination = !!manualPagination;

  React.useEffect(() => {
    setClientPagination((p) => (p.pageSize === defaultPageSize ? p : { ...p, pageSize: defaultPageSize }));
  }, [defaultPageSize]);

  React.useEffect(() => {
    setClientPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [data]);

  const resolvedPagination = isManualPagination && pagination ? pagination : clientPagination;
  const paginationChangeHandler = isManualPagination ? onPaginationChange : setClientPagination;

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: isManualPagination ? undefined : getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: isManualPagination,
    pageCount: isManualPagination ? pageCount : undefined,
    onPaginationChange: paginationChangeHandler,
    manualFiltering,
    initialState: {
      pagination: { pageSize: defaultPageSize },
    },
    state: {
      sorting,
      columnFilters: customSearch || hideSearch ? noColumnFilters : columnFilters,
      columnVisibility,
      rowSelection,
      pagination: resolvedPagination,
    },
  });

  return (
    <div className="space-y-2">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {customSearch ? (
          customSearch
        ) : hideSearch ? (
          <div />
        ) : (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={
                manualFiltering
                  ? (searchValue ?? "")
                  : ((table.getColumn(searchKey)?.getFilterValue() as string) ?? "")
              }
              onChange={(e) => {
                if (manualFiltering && onSearchChange) {
                  onSearchChange(e.target.value);
                } else {
                  table.getColumn(searchKey)?.setFilterValue(e.target.value);
                }
              }}
              className="pl-9 bg-background border-border"
            />
          </div>
        )}

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {leftActions}
          <div className="hidden sm:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      className="capitalize"
                      checked={col.getIsVisible()}
                      onCheckedChange={(val) => col.toggleVisibility(!!val)}
                    >
                      {col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {rightActions}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-none border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-primary overflow-hidden hover:bg-primary/90">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-white [&_button]:text-white [&_svg]:text-white dark:text-black dark:[&_button]:text-black dark:[&_svg]:text-black",
                      (header.column.columnDef.meta as DataTableColumnMeta | undefined)
                        ?.headerClassName,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-b border-border/40">
                  {columns.map((_, ci) => {
                    const w = ["w-full", "w-3/4", "w-1/2", "w-2/3", "w-4/5"][ci % 5];
                    return (
                      <TableCell key={ci}>
                        <Skeleton className={`h-5 ${w} rounded-none`} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        (cell.column.columnDef.meta as DataTableColumnMeta | undefined)
                          ?.cellClassName,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {table.getPageCount() > 0 && (
        <div className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-16 text-xs">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 7, 10, 20, 30, 40, 50].map((n) => (
                  <SelectItem key={n} value={`${n}`} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground text-center sm:text-left">
            {table.getFilteredSelectedRowModel().rows.length > 0
              ? `${table.getFilteredSelectedRowModel().rows.length} of ${totalItems ?? table.getFilteredRowModel().rows.length} selected`
              : `${totalItems ?? table.getFilteredRowModel().rows.length} item(s)`}
          </p>

          <div className="flex items-center gap-1">
            <span className="mr-2 text-xs text-muted-foreground whitespace-nowrap">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">First page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}