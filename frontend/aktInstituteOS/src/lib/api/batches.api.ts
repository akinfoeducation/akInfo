import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  Batch,
  BatchDashboard,
  BatchStudentRow,
  BatchAssignmentHistory,
  CreateBatchRequest,
  UpdateBatchRequest,
  BatchStatus,
} from "@/types/course";

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getBatchDashboard(): Promise<BatchDashboard> {
  const { data } = await apiClient.get<ApiResponse<BatchDashboard>>("/api/v1/batches/dashboard");
  return data.data;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listAllBatches(params?: { status?: BatchStatus; courseId?: number }): Promise<Batch[]> {
  const { data } = await apiClient.get<ApiResponse<Batch[]>>("/api/v1/batches", { params });
  return data.data;
}

export async function getBatch(id: number): Promise<Batch> {
  const { data } = await apiClient.get<ApiResponse<Batch>>(`/api/v1/batches/${id}`);
  return data.data;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createBatch(courseId: number, request: CreateBatchRequest): Promise<Batch> {
  const { data } = await apiClient.post<ApiResponse<Batch>>("/api/v1/batches", request, {
    params: { courseId },
  });
  return data.data;
}

export async function updateBatch(id: number, request: UpdateBatchRequest): Promise<Batch> {
  const { data } = await apiClient.put<ApiResponse<Batch>>(`/api/v1/batches/${id}`, request);
  return data.data;
}

export async function patchBatchStatus(id: number, status: BatchStatus): Promise<Batch> {
  const { data } = await apiClient.patch<ApiResponse<Batch>>(`/api/v1/batches/${id}/status`, { status });
  return data.data;
}

export async function deleteBatch(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/batches/${id}`);
}

// ── Students ──────────────────────────────────────────────────────────────────

export async function getBatchStudents(
  batchId: number,
  page = 0,
  size = 50,
): Promise<BatchStudentRow[]> {
  const { data } = await apiClient.get<ApiResponse<BatchStudentRow[]>>(
    `/api/v1/batches/${batchId}/students`,
    { params: { page, size } },
  );
  return data.data;
}

// ── Assignment history ────────────────────────────────────────────────────────

export async function getBatchAssignmentHistory(admissionId: number): Promise<BatchAssignmentHistory[]> {
  const { data } = await apiClient.get<ApiResponse<BatchAssignmentHistory[]>>(
    "/api/v1/batches/assignments/history",
    { params: { admissionId } },
  );
  return data.data;
}

// ── Assign batch to admission ─────────────────────────────────────────────────

export async function assignBatchToAdmission(
  admissionId: number,
  batchId: number | null,
): Promise<void> {
  await apiClient.patch(`/api/v1/admissions/${admissionId}/batch`, { batchId });
}
