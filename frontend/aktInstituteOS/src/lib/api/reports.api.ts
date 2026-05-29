import apiClient from "./client";
import type {
  ReportOverview, ReportSummary, MonthlyDataPoint, LeadFunnelItem,
  CourseBreakdownItem, AdmissionReportRow, FeeCollectionReportRow,
  PendingFeeReportRow, ExpenseReportRow, DailyCollectionRow,
  BatchStudentReportRow, EnquiryConversionRow, ExportFormat,
} from "@/types/report";
import type { ApiResponse } from "@/types/api";

// ── helpers ───────────────────────────────────────────────────────────────

function get<T>(url: string, params?: Record<string, unknown>) {
  return apiClient.get<ApiResponse<T>>(url, { params }).then(r => r.data);
}

function buildExportUrl(path: string, fmt: ExportFormat, params: Record<string, unknown>) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return `/api/v1/reports/export/${path}.${fmt}${qs ? "?" + qs : ""}`;
}

async function downloadFile(url: string, filename: string) {
  const res = await apiClient.get(url, { responseType: "blob" });
  const blob = new Blob([res.data]);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── Overview + Summary ────────────────────────────────────────────────────

export const getReportOverview = () =>
  get<ReportOverview>("/api/v1/reports/overview").then(r => r.data!);

export const getReportSummary = (from?: string, to?: string) =>
  get<ReportSummary>("/api/v1/reports/summary", { from, to }).then(r => r.data!);

// ── Trend charts ──────────────────────────────────────────────────────────

export const getRevenueTrend     = (months = 12) => get<MonthlyDataPoint[]>("/api/v1/reports/trends/revenue",     { months }).then(r => r.data ?? []);
export const getAdmissionsTrend  = (months = 12) => get<MonthlyDataPoint[]>("/api/v1/reports/trends/admissions",  { months }).then(r => r.data ?? []);
export const getLeadsTrend       = (months = 12) => get<MonthlyDataPoint[]>("/api/v1/reports/trends/leads",       { months }).then(r => r.data ?? []);

export const getLeadsByStatus = (from?: string, to?: string) =>
  get<LeadFunnelItem[]>("/api/v1/reports/leads/by-status", { from, to }).then(r => r.data ?? []);
export const getLeadsBySource = (from?: string, to?: string) =>
  get<LeadFunnelItem[]>("/api/v1/reports/leads/by-source", { from, to }).then(r => r.data ?? []);
export const getCourseBreakdown = (from?: string, to?: string) =>
  get<CourseBreakdownItem[]>("/api/v1/reports/courses/breakdown", { from, to }).then(r => r.data ?? []);

// ── Paginated reports ─────────────────────────────────────────────────────

export interface ReportParams {
  from?: string; to?: string;
  q?: string; page?: number; size?: number;
  sort?: string; dir?: string;
  // admission
  status?: string; course?: string; batch?: string; counsellorId?: string;
  // fee collection
  paymentMode?: string;
  // expenses
  category?: string;
  // conversion
  source?: string;
}

export const getAdmissionReport = (p: ReportParams) =>
  get<AdmissionReportRow[]>("/api/v1/reports/admissions", p as Record<string, unknown>);

export const getFeeCollectionReport = (p: ReportParams) =>
  get<FeeCollectionReportRow[]>("/api/v1/reports/fee-collection", p as Record<string, unknown>);

export const getPendingFeeReport = (p: ReportParams) =>
  get<PendingFeeReportRow[]>("/api/v1/reports/pending-fees", p as Record<string, unknown>);

export const getExpenseReport = (p: ReportParams) =>
  get<ExpenseReportRow[]>("/api/v1/reports/expenses", p as Record<string, unknown>);

export const getDailyCollection = (from?: string, to?: string) =>
  get<DailyCollectionRow[]>("/api/v1/reports/daily-collection", { from, to }).then(r => r.data ?? []);

export const getBatchStudentReport = (p: ReportParams) =>
  get<BatchStudentReportRow[]>("/api/v1/reports/batch-students", p as Record<string, unknown>).then(r => r.data ?? []);

export const getEnquiryConversionReport = (p: ReportParams) =>
  get<EnquiryConversionRow[]>("/api/v1/reports/enquiry-conversion", p as Record<string, unknown>);

// ── Exports ───────────────────────────────────────────────────────────────

export const exportAdmissions = (fmt: ExportFormat, p: ReportParams) =>
  downloadFile(buildExportUrl("admissions", fmt, p as Record<string, unknown>), `admissions.${fmt}`);

export const exportFeeCollection = (fmt: ExportFormat, p: ReportParams) =>
  downloadFile(buildExportUrl("fee-collection", fmt, p as Record<string, unknown>), `fee-collection.${fmt}`);

export const exportPendingFees = (fmt: ExportFormat, p: ReportParams) =>
  downloadFile(buildExportUrl("pending-fees", fmt, p as Record<string, unknown>), `pending-fees.${fmt}`);

export const exportExpenses = (fmt: ExportFormat, p: ReportParams) =>
  downloadFile(buildExportUrl("expenses", fmt, p as Record<string, unknown>), `expenses.${fmt}`);

export const exportEnquiryConversion = (fmt: ExportFormat, p: ReportParams) =>
  downloadFile(buildExportUrl("enquiry-conversion", fmt, p as Record<string, unknown>), `enquiry-conversion.${fmt}`);
