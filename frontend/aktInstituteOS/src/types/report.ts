// ── Overview ──────────────────────────────────────────────────────────────

export interface ReportOverview {
  totalLeads: number;
  newLeadsThisMonth: number;
  convertedLeadsThisMonth: number;
  conversionRate: number;
  totalAdmissions: number;
  admissionsThisMonth: number;
  activeAdmissions: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  totalOutstanding: number;
  overdueCount: number;
  totalStudents: number;
}

// ── Summary bar ───────────────────────────────────────────────────────────

export interface ReportSummary {
  totalAdmissions: number;
  totalFeeCollected: number;
  pendingFees: number;
  partialPayments: number;
  totalExpenses: number;
  netRevenue: number;
}

// ── Trend charts ──────────────────────────────────────────────────────────

export interface MonthlyDataPoint {
  month: string;
  count: number;
  amount: number | null;
}

export interface LeadFunnelItem {
  label: string;
  count: number;
  percent: number;
}

export interface CourseBreakdownItem {
  courseName: string;
  admissions: number;
  revenueCollected: number;
  feesAgreed: number;
  outstanding: number;
}

// ── 8 Report row types ────────────────────────────────────────────────────

export interface AdmissionReportRow {
  id: number;
  admissionNumber: string;
  studentName: string;
  phone: string;
  courseName: string;
  batchName: string;
  feesAgreed: number;
  feesPaid: number;
  feesDue: number;
  status: string;
  counsellorName: string;
  enrollmentDate: string | null;
  createdAt: string;
}

export interface FeeCollectionReportRow {
  id: number;
  receiptNumber: string;
  admissionNumber: string;
  studentName: string;
  phone: string;
  courseName: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string | null;
  collectedBy: string;
}

export interface PendingFeeReportRow {
  id: number;
  admissionNumber: string;
  studentName: string;
  phone: string;
  courseName: string;
  batchName: string;
  feesAgreed: number;
  feesPaid: number;
  feesDue: number;
  status: string;
  enrollmentDate: string | null;
  daysSinceEnrollment: number;
}

export interface ExpenseReportRow {
  id: number;
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  paidTo: string | null;
  paymentMode: string;
  referenceNumber: string | null;
  createdByName: string;
}

export interface DailyCollectionRow {
  date: string;
  dayLabel: string;
  receipts: number;
  collected: number;
  expenses: number;
  net: number;
}

export interface BatchStudentReportRow {
  courseName: string;
  batchName: string;
  totalAdmissions: number;
  active: number;
  completed: number;
  cancelled: number;
  totalFeesAgreed: number;
  totalFeesPaid: number;
  totalFeesDue: number;
}

export interface EnquiryConversionRow {
  id: number;
  leadName: string;
  phone: string;
  source: string;
  courseInterested: string | null;
  status: string;
  counsellorName: string | null;
  createdAt: string;
  convertedAt: string | null;
  daysToConvert: number;
  admissionValue: number;
}

// ── Shared filter state ───────────────────────────────────────────────────

export type DatePreset = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "custom";

export interface DateRange {
  from: string;   // yyyy-MM-dd
  to: string;
}

export type ExportFormat = "csv" | "xlsx";
