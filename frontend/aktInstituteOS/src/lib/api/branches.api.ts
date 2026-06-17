import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type { BranchResponse, DepartmentResponse } from "@/types/user-management";

// ── Branches ──────────────────────────────────────────────────────────────────

export async function listBranches(): Promise<BranchResponse[]> {
  const { data } = await apiClient.get<ApiResponse<BranchResponse[]>>("/api/v1/branches");
  return data.data;
}

export async function getBranch(id: number): Promise<BranchResponse> {
  const { data } = await apiClient.get<ApiResponse<BranchResponse>>(`/api/v1/branches/${id}`);
  return data.data;
}

export interface BranchRequest {
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  active?: boolean;
}

export async function createBranch(payload: BranchRequest): Promise<BranchResponse> {
  const { data } = await apiClient.post<ApiResponse<BranchResponse>>("/api/v1/branches", payload);
  return data.data;
}

export async function updateBranch(id: number, payload: BranchRequest): Promise<BranchResponse> {
  const { data } = await apiClient.put<ApiResponse<BranchResponse>>(`/api/v1/branches/${id}`, payload);
  return data.data;
}

export async function deleteBranch(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/branches/${id}`);
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function listDepartments(): Promise<DepartmentResponse[]> {
  const { data } = await apiClient.get<ApiResponse<DepartmentResponse[]>>("/api/v1/departments");
  return data.data;
}

export interface DepartmentRequest {
  name: string;
  code: string;
  description?: string;
  active?: boolean;
}

export async function createDepartment(payload: DepartmentRequest): Promise<DepartmentResponse> {
  const { data } = await apiClient.post<ApiResponse<DepartmentResponse>>("/api/v1/departments", payload);
  return data.data;
}

export async function updateDepartment(id: number, payload: DepartmentRequest): Promise<DepartmentResponse> {
  const { data } = await apiClient.put<ApiResponse<DepartmentResponse>>(`/api/v1/departments/${id}`, payload);
  return data.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/departments/${id}`);
}
