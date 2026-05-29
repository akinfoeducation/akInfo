import apiClient from "./client";
import type { ApiResponse } from "@/types/api";

// ── Types ─────────────────────────────────────────────────────────────────

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

// ── API calls ─────────────────────────────────────────────────────────────

export const getDashboardSummary = () =>
  apiClient
    .get<ApiResponse<DashboardSummary>>("/api/v1/dashboard/summary")
    .then(r => r.data.data!);

export const getDashboardRecent = () =>
  apiClient
    .get<ApiResponse<DashboardRecent>>("/api/v1/dashboard/recent")
    .then(r => r.data.data!);
