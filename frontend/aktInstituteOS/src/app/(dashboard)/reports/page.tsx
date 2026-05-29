"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ClipboardList, IndianRupee, AlertCircle, Receipt,
  CalendarCheck, TrendingUp, BookOpen, UserCheck,
} from "lucide-react";
import { format, startOfMonth } from "date-fns";
import Link from "next/link";

import { ReportFilterBar } from "@/components/reports/ReportFilterBar";
import { ReportSummaryBar } from "@/components/reports/ReportSummaryBar";
import { ReportTable, type ColumnDef } from "@/components/reports/ReportTable";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getReportSummary, getAdmissionReport, getFeeCollectionReport,
  getPendingFeeReport, getExpenseReport, getDailyCollection,
  getRevenueTrend, getAdmissionsTrend, getLeadsTrend,
  getBatchStudentReport, getEnquiryConversionReport,
  getLeadsByStatus, getLeadsBySource,
  exportAdmissions, exportFeeCollection, exportPendingFees,
  exportExpenses, exportEnquiryConversion,
} from "@/lib/api/reports.api";

import type {
  DateRange, AdmissionReportRow, FeeCollectionReportRow,
  PendingFeeReportRow, ExpenseReportRow, DailyCollectionRow,
  BatchStudentReportRow, EnquiryConversionRow, ExportFormat,
} from "@/types/report";
import type { PageMeta } from "@/types/api";
import { useDebounce } from "@/lib/hooks/useDebounce";

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const compact = (n: number) => {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return format(new Date(s), "dd MMM yyyy"); } catch { return s; }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    DOCUMENTS_PENDING: "bg-amber-100 text-amber-700",
    ENROLLED: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-teal-100 text-teal-700",
    CANCELLED: "bg-red-100 text-red-700",
    NEW: "bg-gray-100 text-gray-700",
    CONTACTED: "bg-blue-100 text-blue-700",
    FOLLOW_UP: "bg-violet-100 text-violet-700",
    CONVERTED: "bg-emerald-100 text-emerald-700",
    LOST: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Tab definition ────────────────────────────────────────────────────────

type TabKey =
  | "admissions" | "fee-collection" | "pending-fees" | "expenses"
  | "daily-collection" | "monthly-revenue" | "batch-students" | "enquiry-conversion";

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: "admissions",         label: "Admissions",        icon: ClipboardList  },
  { key: "fee-collection",     label: "Fee Collection",    icon: IndianRupee    },
  { key: "pending-fees",       label: "Pending Fees",      icon: AlertCircle    },
  { key: "expenses",           label: "Expenses",          icon: Receipt        },
  { key: "daily-collection",   label: "Daily Collection",  icon: CalendarCheck  },
  { key: "monthly-revenue",    label: "Monthly Revenue",   icon: TrendingUp     },
  { key: "batch-students",     label: "Batch / Students",  icon: BookOpen       },
  { key: "enquiry-conversion", label: "Enquiry Conversion",icon: UserCheck      },
];

const PIE_COLORS = ["#10B981","#6366F1","#F59E0B","#F43F5E","#06B6D4","#8B5CF6","#F97316","#14B8A6"];

// ── Main page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const som   = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [activeTab, setActiveTab] = useState<TabKey>("admissions");
  const [dateRange, setDateRange] = useState<DateRange>({ from: som, to: today });
  const [page, setPage]           = useState(0);
  const [sort, setSort]           = useState("created_at");
  const [dir, setDir]             = useState<"asc"|"desc">("desc");
  const [search, setSearch]       = useState("");
  const [extraFilters, setExtra]  = useState<Record<string, string>>({});
  const [trendMonths, setTrend]   = useState(12);

  const debouncedSearch = useDebounce(search, 350);

  // Reset page on tab/filter change
  const resetPage = useCallback(() => setPage(0), []);

  function handleRangeChange(r: DateRange) {
    setDateRange(r);
    resetPage();
  }
  function handleExtraFilter(key: string, value: string) {
    setExtra(prev => ({ ...prev, [key]: value }));
    resetPage();
  }
  function handleSort(key: string, d: "asc" | "desc") {
    setSort(key); setDir(d); resetPage();
  }
  function handleSearch(q: string) {
    setSearch(q); resetPage();
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["report-summary", dateRange],
    queryFn:  () => getReportSummary(dateRange.from, dateRange.to),
    staleTime: 30_000,
  });

  // ── Shared params ─────────────────────────────────────────────────────────

  const baseParams = useMemo(() => ({
    from: dateRange.from, to: dateRange.to,
    q: debouncedSearch || undefined,
    page, size: 20, sort, dir,
    ...Object.fromEntries(Object.entries(extraFilters).filter(([,v])=>v)),
  }), [dateRange, debouncedSearch, page, sort, dir, extraFilters]);

  // ── 1. Admissions ─────────────────────────────────────────────────────────

  const admParams = useMemo(() => ({ ...baseParams, status: extraFilters.status, course: extraFilters.course, batch: extraFilters.batch }), [baseParams, extraFilters]);
  const { data: admData, isLoading: loadingAdm } = useQuery({
    queryKey: ["rep-admissions", admParams],
    queryFn: () => getAdmissionReport(admParams),
    enabled: activeTab === "admissions",
    staleTime: 30_000, placeholderData: prev => prev,
  });

  const admCols: ColumnDef<AdmissionReportRow>[] = [
    { key: "admission_number", label: "Adm #",    sortable: true, render: r => <Link href={`/admissions/${r.id}`} className="font-mono text-xs text-emerald-700 hover:underline">{r.admissionNumber}</Link> },
    { key: "student_name",     label: "Student",  sortable: true, render: r => <div><p className="font-medium text-gray-900">{r.studentName}</p><p className="text-xs text-muted-foreground">{r.phone}</p></div> },
    { key: "course",           label: "Course",   render: r => <div><p className="text-xs">{r.courseName ?? "—"}</p>{r.batchName && <p className="text-[10px] text-muted-foreground">{r.batchName}</p>}</div> },
    { key: "fees_agreed",      label: "Agreed",   sortable: true, align: "right", render: r => <span className="text-xs">{fmt(r.feesAgreed)}</span> },
    { key: "fees_paid",        label: "Paid",     sortable: true, align: "right", render: r => <span className="text-xs text-emerald-700 font-medium">{fmt(r.feesPaid)}</span> },
    { key: "fees_due",         label: "Due",      sortable: true, align: "right", render: r => <span className={`text-xs font-medium ${r.feesDue > 0 ? "text-red-600" : "text-gray-400"}`}>{fmt(r.feesDue)}</span> },
    { key: "status",           label: "Status",   render: r => <StatusBadge status={r.status} /> },
    { key: "counsellor",       label: "Counsellor", render: r => <span className="text-xs text-muted-foreground">{r.counsellorName ?? "—"}</span> },
    { key: "created_at",       label: "Date",     sortable: true, render: r => <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span> },
  ];

  // ── 2. Fee Collection ─────────────────────────────────────────────────────

  const feeParams = useMemo(() => ({ ...baseParams, course: extraFilters.course, paymentMode: extraFilters.paymentMode, sort: sort === "created_at" ? "payment_date" : sort }), [baseParams, extraFilters, sort]);
  const { data: feeData, isLoading: loadingFee } = useQuery({
    queryKey: ["rep-fee-col", feeParams],
    queryFn: () => getFeeCollectionReport(feeParams),
    enabled: activeTab === "fee-collection",
    staleTime: 30_000, placeholderData: prev => prev,
  });

  const feeCols: ColumnDef<FeeCollectionReportRow>[] = [
    { key: "receipt_number",   label: "Receipt #", render: r => <span className="font-mono text-xs text-emerald-700">{r.receiptNumber}</span> },
    { key: "student_name",     label: "Student",   sortable: true, render: r => <div><p className="font-medium text-gray-900">{r.studentName}</p><p className="text-xs text-muted-foreground">{r.phone}</p></div> },
    { key: "admission_number", label: "Adm #",     render: r => <Link href={`/admissions/${r.id}`} className="font-mono text-xs hover:underline text-gray-600">{r.admissionNumber}</Link> },
    { key: "course",           label: "Course",    render: r => <span className="text-xs">{r.courseName ?? "—"}</span> },
    { key: "amount",           label: "Amount",    sortable: true, align: "right", render: r => <span className="font-semibold text-emerald-700">{fmt(r.amount)}</span> },
    { key: "payment_date",     label: "Date",      sortable: true, render: r => <span className="text-xs text-muted-foreground">{fmtDate(r.paymentDate)}</span> },
    { key: "payment_mode",     label: "Mode",      render: r => <span className="text-xs">{r.paymentMode}</span> },
    { key: "collected_by",     label: "By",        render: r => <span className="text-xs text-muted-foreground">{r.collectedBy ?? "—"}</span> },
  ];

  // ── 3. Pending Fees ───────────────────────────────────────────────────────

  const pendParams = useMemo(() => ({ ...baseParams, course: extraFilters.course, batch: extraFilters.batch, status: extraFilters.status, sort: sort === "created_at" ? "fees_due" : sort }), [baseParams, extraFilters, sort]);
  const { data: pendData, isLoading: loadingPend } = useQuery({
    queryKey: ["rep-pending", pendParams],
    queryFn: () => getPendingFeeReport(pendParams),
    enabled: activeTab === "pending-fees",
    staleTime: 30_000, placeholderData: prev => prev,
  });

  const pendCols: ColumnDef<PendingFeeReportRow>[] = [
    { key: "admission_number", label: "Adm #",   render: r => <Link href={`/admissions/${r.id}`} className="font-mono text-xs text-emerald-700 hover:underline">{r.admissionNumber}</Link> },
    { key: "student_name",     label: "Student", sortable: true, render: r => <div><p className="font-medium text-gray-900">{r.studentName}</p><p className="text-xs text-muted-foreground">{r.phone}</p></div> },
    { key: "course",           label: "Course",  render: r => <div><p className="text-xs">{r.courseName ?? "—"}</p>{r.batchName && <p className="text-[10px] text-muted-foreground">{r.batchName}</p>}</div> },
    { key: "fees_agreed",      label: "Agreed",  sortable: true, align: "right", render: r => <span className="text-xs">{fmt(r.feesAgreed)}</span> },
    { key: "fees_paid",        label: "Paid",    sortable: true, align: "right", render: r => <span className="text-xs text-emerald-700">{fmt(r.feesPaid)}</span> },
    { key: "fees_due",         label: "Due",     sortable: true, align: "right", render: r => <span className="text-sm font-bold text-red-600">{fmt(r.feesDue)}</span> },
    { key: "days_since",       label: "Days",    sortable: true, align: "center", render: r => (
      <span className={`text-xs font-medium ${r.daysSinceEnrollment > 60 ? "text-red-600" : r.daysSinceEnrollment > 30 ? "text-amber-600" : "text-gray-600"}`}>
        {r.daysSinceEnrollment}d
      </span>
    )},
    { key: "status",           label: "Status",  render: r => <StatusBadge status={r.status} /> },
  ];

  // ── 4. Expenses ───────────────────────────────────────────────────────────

  const expParams = useMemo(() => ({ ...baseParams, category: extraFilters.category, sort: sort === "created_at" ? "expense_date" : sort }), [baseParams, extraFilters, sort]);
  const { data: expData, isLoading: loadingExp } = useQuery({
    queryKey: ["rep-expenses", expParams],
    queryFn: () => getExpenseReport(expParams),
    enabled: activeTab === "expenses",
    staleTime: 30_000, placeholderData: prev => prev,
  });

  const expCols: ColumnDef<ExpenseReportRow>[] = [
    { key: "expense_number", label: "Exp #",      render: r => <span className="font-mono text-xs text-gray-600">{r.expenseNumber}</span> },
    { key: "category",       label: "Category",   render: r => <span className="text-xs font-medium">{r.category}</span> },
    { key: "description",    label: "Description",render: r => <span className="text-xs text-gray-700 max-w-xs truncate block">{r.description}</span> },
    { key: "amount",         label: "Amount",     sortable: true, align: "right", render: r => <span className="font-semibold text-rose-600">{fmt(r.amount)}</span> },
    { key: "expense_date",   label: "Date",       sortable: true, render: r => <span className="text-xs text-muted-foreground">{fmtDate(r.expenseDate)}</span> },
    { key: "paid_to",        label: "Paid To",    render: r => <span className="text-xs text-muted-foreground">{r.paidTo ?? "—"}</span> },
    { key: "payment_mode",   label: "Mode",       render: r => <span className="text-xs">{r.paymentMode}</span> },
    { key: "recorded_by",    label: "By",         render: r => <span className="text-xs text-muted-foreground">{r.createdByName ?? "—"}</span> },
  ];

  // ── 5. Daily Collection ───────────────────────────────────────────────────

  const { data: dailyData = [], isLoading: loadingDaily } = useQuery({
    queryKey: ["rep-daily", dateRange],
    queryFn: () => getDailyCollection(dateRange.from, dateRange.to),
    enabled: activeTab === "daily-collection",
    staleTime: 30_000,
  });

  const dailyCols: ColumnDef<DailyCollectionRow>[] = [
    { key: "day",       label: "Day",       render: r => <span className="text-sm font-medium text-gray-800">{r.dayLabel}</span> },
    { key: "receipts",  label: "Receipts",  align: "center", render: r => <span className="text-sm">{r.receipts}</span> },
    { key: "collected", label: "Collected", align: "right",  render: r => <span className="font-semibold text-emerald-700">{fmt(r.collected)}</span> },
    { key: "expenses",  label: "Expenses",  align: "right",  render: r => <span className="text-rose-600">{fmt(r.expenses)}</span> },
    { key: "net",       label: "Net",       align: "right",  render: r => <span className={`font-bold ${r.net >= 0 ? "text-teal-700" : "text-red-600"}`}>{fmt(r.net)}</span> },
  ];

  // ── 6. Monthly Revenue ────────────────────────────────────────────────────

  const { data: revTrend    = [] } = useQuery({ queryKey: ["rep-rev-trend",  trendMonths], queryFn: () => getRevenueTrend(trendMonths),    enabled: activeTab === "monthly-revenue", staleTime: 60_000 });
  const { data: admTrend    = [] } = useQuery({ queryKey: ["rep-adm-trend",  trendMonths], queryFn: () => getAdmissionsTrend(trendMonths), enabled: activeTab === "monthly-revenue", staleTime: 60_000 });
  const { data: leadTrend   = [] } = useQuery({ queryKey: ["rep-lead-trend", trendMonths], queryFn: () => getLeadsTrend(trendMonths),      enabled: activeTab === "monthly-revenue", staleTime: 60_000 });
  const { data: byStatus    = [] } = useQuery({ queryKey: ["rep-by-status",  dateRange],   queryFn: () => getLeadsByStatus(dateRange.from, dateRange.to), enabled: activeTab === "monthly-revenue", staleTime: 60_000 });
  const { data: bySource    = [] } = useQuery({ queryKey: ["rep-by-source",  dateRange],   queryFn: () => getLeadsBySource(dateRange.from, dateRange.to), enabled: activeTab === "monthly-revenue", staleTime: 60_000 });

  const fmtCompact = (v: unknown) => compact(v as number);

  // ── 7. Batch-wise Students ────────────────────────────────────────────────

  const { data: batchData = [], isLoading: loadingBatch } = useQuery({
    queryKey: ["rep-batch", dateRange, extraFilters.course],
    queryFn: () => getBatchStudentReport({ from: dateRange.from, to: dateRange.to, course: extraFilters.course }),
    enabled: activeTab === "batch-students",
    staleTime: 30_000,
  });

  const batchCols: ColumnDef<BatchStudentReportRow>[] = [
    { key: "course_name",      label: "Course", render: r => <span className="font-medium text-gray-900">{r.courseName}</span> },
    { key: "batch_name",       label: "Batch",  render: r => <span className="text-xs text-muted-foreground">{r.batchName}</span> },
    { key: "total_admissions", label: "Total",  align: "center", render: r => <span className="font-semibold">{r.totalAdmissions}</span> },
    { key: "active",           label: "Active", align: "center", render: r => <span className="text-emerald-600 font-medium">{r.active}</span> },
    { key: "completed",        label: "Completed", align: "center", render: r => <span className="text-teal-600">{r.completed}</span> },
    { key: "cancelled",        label: "Cancelled", align: "center", render: r => <span className="text-red-400">{r.cancelled}</span> },
    { key: "fees_agreed",      label: "Agreed", align: "right",  render: r => <span className="text-xs">{fmt(r.totalFeesAgreed)}</span> },
    { key: "fees_paid",        label: "Paid",   align: "right",  render: r => <span className="text-xs text-emerald-700 font-medium">{fmt(r.totalFeesPaid)}</span> },
    { key: "fees_due",         label: "Due",    align: "right",  render: r => <span className={`text-xs font-medium ${r.totalFeesDue > 0 ? "text-red-600" : "text-gray-400"}`}>{fmt(r.totalFeesDue)}</span> },
  ];

  // ── 8. Enquiry Conversion ─────────────────────────────────────────────────

  const convParams = useMemo(() => ({ ...baseParams, source: extraFilters.source }), [baseParams, extraFilters]);
  const { data: convData, isLoading: loadingConv } = useQuery({
    queryKey: ["rep-conv", convParams],
    queryFn: () => getEnquiryConversionReport(convParams),
    enabled: activeTab === "enquiry-conversion",
    staleTime: 30_000, placeholderData: prev => prev,
  });

  const convCols: ColumnDef<EnquiryConversionRow>[] = [
    { key: "lead_name",   label: "Name",    sortable: true, render: r => <div><p className="font-medium text-gray-900">{r.leadName}</p><p className="text-xs text-muted-foreground">{r.phone}</p></div> },
    { key: "source",      label: "Source",  sortable: true, render: r => <span className="text-xs">{r.source.replace(/_/g," ")}</span> },
    { key: "course",      label: "Interest", render: r => <span className="text-xs text-muted-foreground">{r.courseInterested ?? "—"}</span> },
    { key: "status",      label: "Status",  render: r => <StatusBadge status={r.status} /> },
    { key: "counsellor",  label: "Counsellor", render: r => <span className="text-xs text-muted-foreground">{r.counsellorName ?? "—"}</span> },
    { key: "created_at",  label: "Enquiry Date", sortable: true, render: r => <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span> },
    { key: "converted_at",label: "Converted",    render: r => <span className="text-xs text-muted-foreground">{fmtDate(r.convertedAt)}</span> },
    { key: "days",        label: "Days", sortable: true, align: "center", render: r => (
      <span className={`text-xs font-medium ${r.daysToConvert < 0 ? "text-gray-400" : r.daysToConvert > 14 ? "text-amber-600" : "text-emerald-600"}`}>
        {r.daysToConvert < 0 ? "—" : `${r.daysToConvert}d`}
      </span>
    )},
    { key: "value",       label: "Value", align: "right", render: r => r.admissionValue > 0 ? <span className="text-xs font-medium text-emerald-700">{fmt(r.admissionValue)}</span> : <span className="text-xs text-muted-foreground">—</span> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  const getPageMeta = (responseData: { meta?: PageMeta } | undefined): PageMeta | undefined => responseData?.meta;

  const extraFilterDefs = useMemo(() => {
    const ADMISSION_STATUS = [
      { value: "PENDING", label: "Pending" }, { value: "DOCUMENTS_PENDING", label: "Docs Pending" },
      { value: "ENROLLED", label: "Enrolled" }, { value: "ACTIVE", label: "Active" },
      { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" },
    ];
    const PAYMENT_MODES = ["CASH","UPI","CHEQUE","BANK_TRANSFER","OTHER"].map(v=>({value:v,label:v}));
    const EXPENSE_CATS  = ["RENT","SALARY","UTILITIES","MARKETING","SUPPLIES","OTHER"].map(v=>({value:v,label:v}));
    const LEAD_SOURCES  = ["WALK_IN","PHONE","WHATSAPP","FACEBOOK","INSTAGRAM","GOOGLE","REFERRAL","OTHER"].map(v=>({value:v,label:v.replace(/_/g," ")}));

    switch (activeTab) {
      case "admissions":       return [{ key:"status", label:"Status", options:ADMISSION_STATUS }];
      case "fee-collection":   return [{ key:"paymentMode", label:"Payment Mode", options:PAYMENT_MODES }];
      case "pending-fees":     return [{ key:"status", label:"Status", options:ADMISSION_STATUS.filter(s=>!["COMPLETED","CANCELLED"].includes(s.value)) }];
      case "expenses":         return [{ key:"category", label:"Category", options:EXPENSE_CATS }];
      case "batch-students":   return [];
      case "enquiry-conversion": return [{ key:"source", label:"Source", options:LEAD_SOURCES }];
      default: return [];
    }
  }, [activeTab]);

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setSearch("");
    setExtra({});
    setPage(0);
    setSort("created_at");
    setDir("desc");
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Analytics and reporting for AKT Institute</p>
      </div>

      {/* Filter bar — shared across all tabs */}
      <ReportFilterBar
        onChange={handleRangeChange}
        extraFilters={extraFilterDefs}
        onExtraFilterChange={handleExtraFilter}
        extraFilterValues={extraFilters}
      />

      {/* Summary bar */}
      <ReportSummaryBar summary={summary} loading={loadingSummary} />

      {/* Tab strip */}
      <div className="flex gap-0.5 overflow-x-auto pb-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-white border border-b-white border-gray-200 -mb-px text-emerald-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}

      {/* 1. Admissions */}
      {activeTab === "admissions" && (
        <ReportTable
          columns={admCols}
          data={admData?.data ?? []}
          meta={getPageMeta(admData)}
          loading={loadingAdm}
          searchPlaceholder="Search by name, phone, admission #…"
          onSearchChange={handleSearch}
          onPageChange={setPage}
          onSort={handleSort}
          sortKey={sort}
          sortDir={dir}
          onExport={f => exportAdmissions(f as ExportFormat, { from: dateRange.from, to: dateRange.to, q: debouncedSearch, ...extraFilters })}
          emptyMessage="No admissions found for the selected period."
        />
      )}

      {/* 2. Fee Collection */}
      {activeTab === "fee-collection" && (
        <ReportTable
          columns={feeCols}
          data={feeData?.data ?? []}
          meta={getPageMeta(feeData)}
          loading={loadingFee}
          searchPlaceholder="Search by name, phone, receipt #…"
          onSearchChange={handleSearch}
          onPageChange={setPage}
          onSort={handleSort}
          sortKey={sort}
          sortDir={dir}
          onExport={f => exportFeeCollection(f as ExportFormat, { from: dateRange.from, to: dateRange.to, q: debouncedSearch, ...extraFilters })}
        />
      )}

      {/* 3. Pending Fees */}
      {activeTab === "pending-fees" && (
        <ReportTable
          columns={pendCols}
          data={pendData?.data ?? []}
          meta={getPageMeta(pendData)}
          loading={loadingPend}
          searchPlaceholder="Search by name, phone, admission #…"
          onSearchChange={handleSearch}
          onPageChange={setPage}
          onSort={handleSort}
          sortKey={sort}
          sortDir={dir}
          onExport={f => exportPendingFees(f as ExportFormat, { q: debouncedSearch, ...extraFilters })}
          emptyMessage="No pending fee records. All fees are collected!"
        />
      )}

      {/* 4. Expenses */}
      {activeTab === "expenses" && (
        <ReportTable
          columns={expCols}
          data={expData?.data ?? []}
          meta={getPageMeta(expData)}
          loading={loadingExp}
          searchPlaceholder="Search by description, paid to…"
          onSearchChange={handleSearch}
          onPageChange={setPage}
          onSort={handleSort}
          sortKey={sort}
          sortDir={dir}
          onExport={f => exportExpenses(f as ExportFormat, { from: dateRange.from, to: dateRange.to, q: debouncedSearch, ...extraFilters })}
          emptyMessage="No expenses recorded for this period."
        />
      )}

      {/* 5. Daily Collection */}
      {activeTab === "daily-collection" && (
        <ReportTable
          columns={dailyCols}
          data={dailyData}
          loading={loadingDaily}
          emptyMessage="No collections found for this period."
        />
      )}

      {/* 6. Monthly Revenue */}
      {activeTab === "monthly-revenue" && (
        <div className="space-y-4">
          <div className="flex gap-1.5 bg-gray-100 rounded-lg p-1 w-fit">
            {([6, 12] as const).map(m => (
              <button key={m} onClick={() => setTrend(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${trendMonths===m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {m} months
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <p className="text-sm font-semibold text-gray-800 mb-4">Monthly Revenue</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revTrend} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} width={40} tickFormatter={fmtCompact} />
                  <Tooltip formatter={(v: unknown) => [compact(v as number), "Revenue"]} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Bar dataKey="amount" name="Revenue" fill="#10B981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <p className="text-sm font-semibold text-gray-800 mb-4">Admissions vs Leads</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={admTrend.map((pt,i) => ({ month: pt.month, admissions: pt.count, leads: leadTrend[i]?.count ?? 0 }))} barGap={2} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} width={28} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Bar dataKey="leads"      name="Leads"      fill="#6366F1" radius={[4,4,0,0]} />
                  <Bar dataKey="admissions" name="Admissions" fill="#10B981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <p className="text-sm font-semibold text-gray-800 mb-4">Leads by Status</p>
              <div className="space-y-2.5">
                {byStatus.length === 0
                  ? <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
                  : byStatus.map((item,i) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{item.label.replace(/_/g," ")}</span>
                        <span className="text-muted-foreground">{item.count} ({item.percent}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width:`${item.percent}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                    </div>
                  ))
                }
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm font-semibold text-gray-800 mb-2">Leads by Source</p>
              {bySource.length === 0
                ? <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={bySource} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {bySource.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown, n: unknown) => [`${v} leads`, String(n).replace(/_/g," ")]} />
                      <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-gray-600">{v.replace(/_/g," ")}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )
              }
            </Card>
          </div>
        </div>
      )}

      {/* 7. Batch / Students */}
      {activeTab === "batch-students" && (
        <ReportTable
          columns={batchCols}
          data={batchData}
          loading={loadingBatch}
          emptyMessage="No batch data for the selected period."
        />
      )}

      {/* 8. Enquiry Conversion */}
      {activeTab === "enquiry-conversion" && (
        <ReportTable
          columns={convCols}
          data={convData?.data ?? []}
          meta={getPageMeta(convData)}
          loading={loadingConv}
          searchPlaceholder="Search by name, phone…"
          onSearchChange={handleSearch}
          onPageChange={setPage}
          onSort={handleSort}
          sortKey={sort}
          sortDir={dir}
          onExport={f => exportEnquiryConversion(f as ExportFormat, { from: dateRange.from, to: dateRange.to, q: debouncedSearch, ...extraFilters })}
        />
      )}

    </div>
  );
}
