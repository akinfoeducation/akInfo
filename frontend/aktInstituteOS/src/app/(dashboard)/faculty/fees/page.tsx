"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, IndianRupee, CheckCircle2, AlertCircle, Clock, Search } from "lucide-react";
import { format } from "date-fns";

import { getFacultyFees, type FacultyAdmissionFeeRow } from "@/lib/api/fees.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ── Helpers ────────────────────────────────────────────────────────────────

function inr(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return format(new Date(s), "dd MMM yyyy"); } catch { return s ?? "—"; }
}

const FEE_STATUS_CONFIG = {
  PAID:    { label: "Paid",    bg: "bg-emerald-50 text-emerald-700", icon: CheckCircle2, iconCls: "text-emerald-500" },
  PARTIAL: { label: "Partial", bg: "bg-amber-50 text-amber-700",     icon: Clock,        iconCls: "text-amber-500"   },
  PENDING: { label: "Pending", bg: "bg-red-50 text-red-700",         icon: AlertCircle,  iconCls: "text-red-500"     },
};

type FilterType = "all" | "pending" | "collected";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all",       label: "All Students" },
  { value: "pending",   label: "Pending Fees" },
  { value: "collected", label: "Fees Collected" },
];

function FeeRow({ row }: { row: FacultyAdmissionFeeRow }) {
  const cfg = FEE_STATUS_CONFIG[row.feeStatus];
  const StatusIcon = cfg.icon;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm">{row.studentName}</div>
        {row.phone && <div className="text-xs text-muted-foreground">{row.phone}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{row.batchName ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{row.courseName ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-right font-medium">{inr(row.feesAgreed)}</td>
      <td className="px-4 py-3 text-sm text-right font-medium text-emerald-700">{inr(row.feesPaid)}</td>
      <td className="px-4 py-3 text-sm text-right font-medium">
        <span className={row.feesDue > 0 ? "text-red-600" : "text-gray-400"}>
          {inr(row.feesDue)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-center">{fmtDate(row.lastPaymentDate)}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg}`}>
          <StatusIcon className={`size-3 ${cfg.iconCls}`} />
          {cfg.label}
        </span>
      </td>
      {row.studentId && (
        <td className="px-4 py-3">
          <Link href={`/students/${row.studentId}`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">View</Button>
          </Link>
        </td>
      )}
    </tr>
  );
}

export default function FacultyFeesPage() {
  const searchParams  = useSearchParams();
  const initialType   = (searchParams.get("type") ?? "all") as FilterType;
  const [type,    setType]    = useState<FilterType>(initialType);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(0);
  const PAGE_SIZE = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["faculty-fees", type, page],
    queryFn:  () => getFacultyFees(type, page, PAGE_SIZE),
  });

  const rows  = (data?.data ?? []).filter(r =>
    !search || r.studentName.toLowerCase().includes(search.toLowerCase()) ||
    (r.batchName ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const meta  = data?.meta;
  const total = meta?.total ?? 0;

  // Summary aggregates from current page (full dataset scoped server-side)
  const totalDue       = rows.reduce((s, r) => s + r.feesDue,    0);
  const totalCollected = rows.reduce((s, r) => s + r.feesPaid,   0);
  const overdueCount   = rows.filter(r => r.feeStatus !== "PAID").length;

  return (
    <div className="space-y-5 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Fee Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Read-only · Assigned batch students only
          </p>
        </div>
      </div>

      {/* Summary chips */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs text-emerald-700 font-medium">Collected (this view)</p>
              <p className="text-xl font-bold text-emerald-800">{inr(totalCollected)}</p>
            </div>
          </div>
          <div className={`border rounded-xl p-4 flex items-center gap-3 ${totalDue > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
            <AlertCircle className={`size-5 shrink-0 ${totalDue > 0 ? "text-red-500" : "text-gray-400"}`} />
            <div>
              <p className={`text-xs font-medium ${totalDue > 0 ? "text-red-700" : "text-gray-500"}`}>Pending (this view)</p>
              <p className={`text-xl font-bold ${totalDue > 0 ? "text-red-800" : "text-gray-500"}`}>{inr(totalDue)}</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <IndianRupee className="size-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Students with dues</p>
              <p className="text-xl font-bold text-gray-700">{overdueCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setType(opt.value); setPage(0); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                type === opt.value
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student or batch…"
            className="pl-8 h-9 text-sm"
          />
        </div>

        {total > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">{total} students</span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <IndianRupee className="size-10 mx-auto mb-3 opacity-20" />
            <p>No fee records found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Batch</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Fee</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Paid</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Due</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Last Payment</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => <FeeRow key={r.admissionId} row={r} />)}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {(meta?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {meta?.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!meta?.hasNext} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
