import apiClient from "./client";
import type { ApiResponse } from "@/types/api";

// ── Admin dashboard types ─────────────────────────────────────────────────

export interface DashboardSummary {
  totalStudents: number;
  todayAdmissions: number;
  monthAdmissions: number;
  totalAdmissions: number;
  activeBatches: number;
  todayFeeCollection: number;
  todayFeeCount: number;
  pendingFees: number;
  overdueCount: number;
  totalEnquiries: number;
  monthEnquiries: number;
  todayFollowUps: number;
}

export interface RecentAdmission {
  id: number;
  admissionNumber: string;
  studentName: string;
  phone: string;
  courseName: string | null;
  status: string;
  createdAt: string;
}

export interface RecentPayment {
  id: number;
  receiptNumber: string;
  studentName: string;
  amount: number;
  paymentMode: string;
  courseName: string | null;
  paymentDate: string;
}

export interface RecentEnquiry {
  id: number;
  leadName: string;
  phone: string;
  source: string;
  courseInterested: string | null;
  status: string;
  createdAt: string;
}

export interface DashboardRecent {
  admissions: RecentAdmission[];
  payments:   RecentPayment[];
  enquiries:  RecentEnquiry[];
}

// ── Faculty dashboard types ───────────────────────────────────────────────

export interface FacultyRecentSession {
  id: number;
  batchName: string | null;
  subject: string | null;
  sessionDate: string;
  status: string;
  attendanceMarked: boolean;
  presentCount: number;
  totalStudents: number;
}

export interface FacultyDashboard {
  // Batch aggregates
  assignedBatches: number;
  activeBatches: number;
  plannedBatches: number;
  // Student aggregates
  totalAssignedStudents: number;
  activeStudents: number;
  overdueStudents: number;
  // Fee summary (read-only)
  totalPendingFees: number;
  totalFeesCollected: number;
  // Session/attendance
  avgAttendancePercent: number;
  totalSessionsConducted: number;
  sessionsWithAttendancePending: number;
  // Secondary: today / this week
  todaySessions: number;
  thisWeekSessions: number;
  recentSessions: FacultyRecentSession[];
}

// ── API calls ─────────────────────────────────────────────────────────────

export const getDashboardSummary = () =>
  apiClient
    .get<ApiResponse<DashboardSummary>>("/api/v1/dashboard/summary")
    .then(r => r.data.data!);

export const getDashboardRecent = () =>
  apiClient
    .get<ApiResponse<DashboardRecent>>("/api/v1/dashboard/recent")
    .then(r => r.data.data!);

export const getFacultyDashboard = () =>
  apiClient
    .get<ApiResponse<FacultyDashboard>>("/api/v1/dashboard/faculty")
    .then(r => r.data.data!);

// ── Caller dashboard types ────────────────────────────────────────────────

export interface CallerDashboard {
  assignedLeads: number;
  interestedLeads: number;
  admissionInterested: number;
  pendingCallbacks: number;
  paymentPending: number;
  bookingConfirmed: number;
  todayFollowUps: number;
  overdueFollowUps: number;
}

export const getCallerDashboard = (from?: string, to?: string) =>
  apiClient
    .get<ApiResponse<CallerDashboard>>("/api/v1/dashboard/caller", {
      params: { ...(from && { from }), ...(to && { to }) },
    })
    .then(r => r.data.data!);

// ── Admin Caller Performance types ───────────────────────────────────────

export interface CallerPerformanceRow {
  callerId: number;
  callerName: string;
  callerPhone?: string;
  leadsAssigned: number;
  callsAttempted: number;
  connected: number;
  notConnected: number;
  interested: number;
  followUps: number;
  visitPlanned: number;
  admissionsConverted: number;
  branchTransfers: number;
  connectionRate: number;
  interestedRate: number;
  admissionConversionRate: number;
  lastActivityAt?: string;
}

export interface RecentCallerActivity {
  callerName?: string;
  leadName?: string;
  actionType: string;
  description?: string;
  createdAt?: string;
}

export interface BranchTransferLog {
  leadName?: string;
  callerName?: string;
  branchName?: string;
  notes?: string;
  transferredAt?: string;
}

export interface CallerPerformance {
  callers: CallerPerformanceRow[];
  retryPoolTotal: number;
  retryPickedToday: number;
  retryPending: number;
  recentActivity: RecentCallerActivity[];
  branchTransfers: BranchTransferLog[];
}

export const getCallerPerformance = (from?: string, to?: string) =>
  apiClient
    .get<ApiResponse<CallerPerformance>>("/api/v1/dashboard/caller-performance", {
      params: { ...(from && { from }), ...(to && { to }) },
    })
    .then(r => r.data.data!);

// ── Caller detail types ───────────────────────────────────────────────────

export interface CallerStatusCount {
  status: string;
  count: number;
}

export interface CallerRecentLead {
  leadId: number;
  leadName?: string;
  phone: string;
  status: string;
  courseInterested?: string;
  assignedAt?: string;
  lastActivityAt?: string;
}

export interface CallerDetail {
  callerId: number;
  callerName: string;
  callerPhone?: string;
  callerEmail?: string;
  stats?: CallerPerformanceRow;
  statusBreakdown: CallerStatusCount[];
  recentLeads: CallerRecentLead[];
  activities: RecentCallerActivity[];
  branchTransfers: BranchTransferLog[];
}

export const getCallerDetail = (callerId: number, from?: string, to?: string) =>
  apiClient
    .get<ApiResponse<CallerDetail>>(`/api/v1/dashboard/caller-performance/${callerId}`, {
      params: { ...(from && { from }), ...(to && { to }) },
    })
    .then(r => r.data.data!);

// ── Counsellor dashboard types ────────────────────────────────────────────

export interface CounsellorDashboard {
  // Lead pipeline
  myActiveLeads: number;
  newlyAssigned: number;
  followUpAfterVisit: number;
  negotiation: number;
  paymentPending: number;
  bookingConfirmed: number;
  documentPending: number;
  admissionInProgress: number;
  notInterested: number;
  // Follow-ups
  todayFollowUps: number;
  overdueFollowUps: number;
  // Admissions
  admissionsDoneThisMonth: number;
  admissionsDoneAllTime: number;
  pendingAdmissions: number;
  // Revenue
  revenueThisMonth: number;
  revenueAllTime: number;
  feesOutstanding: number;
  // Delivery mode split
  onlineLeadsActive: number;
  offlineLeadsActive: number;
  onlineAdmissionsThisMonth: number;
  offlineAdmissionsThisMonth: number;
  onlineAdmissionsPending: number;
  offlineAdmissionsPending: number;
}

export const getCounsellorDashboard = (counsellorId?: number) =>
  apiClient
    .get<ApiResponse<CounsellorDashboard>>("/api/v1/dashboard/counsellor", {
      params: { ...(counsellorId && { counsellorId }) },
    })
    .then(r => r.data.data!);
