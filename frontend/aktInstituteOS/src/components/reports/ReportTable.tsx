"use client";

import { useState } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageMeta } from "@/types/api";
import type { ExportFormat } from "@/types/report";

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: ColumnDef<T>[];
  data: T[];
  meta?: PageMeta;
  loading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, dir: "asc" | "desc") => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onExport?: (fmt: ExportFormat) => void;
  emptyMessage?: string;
}

export function ReportTable<T>({
  columns, data, meta, loading,
  searchPlaceholder = "Search…",
  searchValue = "",
  onSearchChange,
  onPageChange,
  onSort,
  sortKey,
  sortDir = "desc",
  onExport,
  emptyMessage = "No data for the selected period.",
}: Props<T>) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  function handleSearch(v: string) {
    setLocalSearch(v);
    onSearchChange?.(v);
  }

  function handleSort(key: string) {
    if (!onSort) return;
    const newDir = sortKey === key && sortDir === "desc" ? "asc" : "desc";
    onSort(key, newDir);
  }

  function SortIcon({ col }: { col: string }) {
    if (col !== sortKey) return <ChevronsUpDown className="size-3 text-gray-300 ml-1 inline" />;
    return sortDir === "asc"
      ? <ChevronUp   className="size-3 text-emerald-500 ml-1 inline" />
      : <ChevronDown className="size-3 text-emerald-500 ml-1 inline" />;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        {onSearchChange && (
          <div className="relative min-w-56 flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={e => handleSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        )}

        {meta && (
          <p className="text-xs text-muted-foreground ml-auto">
            {meta.total.toLocaleString()} records
          </p>
        )}

        {onExport && (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => onExport("csv")}
              className="h-8 text-xs gap-1.5">
              <FileText className="size-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport("xlsx")}
              className="h-8 text-xs gap-1.5">
              <FileSpreadsheet className="size-3.5 text-emerald-600" /> Excel
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap
                      ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                      ${col.sortable ? "cursor-pointer select-none hover:text-gray-800" : ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-2.5">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">
            Page {meta.page + 1} of {meta.totalPages} · {meta.total.toLocaleString()} total
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm"
              disabled={!meta.hasPrevious || loading}
              onClick={() => onPageChange?.(meta.page - 1)}
              className="h-7 w-7 p-0">
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm"
              disabled={!meta.hasNext || loading}
              onClick={() => onPageChange?.(meta.page + 1)}
              className="h-7 w-7 p-0">
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
