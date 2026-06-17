import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  FeePayment,
  FeesSummary,
  CreateFeePaymentRequest,
  FeeListParams,
} from "@/types/fees";

export async function getFeesSummary(): Promise<FeesSummary> {
  const { data } = await apiClient.get<ApiResponse<FeesSummary>>("/api/v1/fees/summary");
  return data.data;
}

export async function listPayments(params: FeeListParams = {}): Promise<ApiResponse<FeePayment[]>> {
  const { data } = await apiClient.get<ApiResponse<FeePayment[]>>("/api/v1/fees", { params });
  return data;
}

export async function collectPayment(request: CreateFeePaymentRequest): Promise<FeePayment> {
  const { data } = await apiClient.post<ApiResponse<FeePayment>>("/api/v1/fees", request);
  return data.data;
}

export async function cancelPayment(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/fees/${id}`);
}

// ── Faculty-scoped fee views (read-only) ──────────────────────────────────

export interface FacultyAdmissionFeeRow {
  admissionId: number;
  admissionNumber: string;
  studentId: number | null;
  studentName: string;
  phone: string | null;
  batchId: number;
  batchName: string | null;
  courseName: string | null;
  feesAgreed: number;
  feesPaid: number;
  feesDue: number;
  feeStatus: "PAID" | "PARTIAL" | "PENDING";
  lastPaymentDate: string | null;
  enrollmentDate: string | null;
  admissionStatus: string;
}

export async function getFacultyFees(
  type: "all" | "pending" | "collected" = "all",
  page = 0,
  size = 50,
): Promise<ApiResponse<FacultyAdmissionFeeRow[]>> {
  const { data } = await apiClient.get<ApiResponse<FacultyAdmissionFeeRow[]>>(
    "/api/v1/fees/faculty",
    { params: { type: type === "all" ? "" : type, page, size } },
  );
  return data;
}

export async function getFacultyStudentFees(
  studentId: number,
): Promise<FacultyAdmissionFeeRow[]> {
  const { data } = await apiClient.get<ApiResponse<FacultyAdmissionFeeRow[]>>(
    `/api/v1/fees/faculty/student/${studentId}`,
  );
  return data.data ?? [];
}
