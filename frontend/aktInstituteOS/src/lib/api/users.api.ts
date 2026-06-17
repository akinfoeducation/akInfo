import apiClient from "./client";
import type { ApiResponse, PagedApiResponse } from "@/types/api";
import type {
  UserResponse, CreateUserRequest, UpdateUserRequest, UserSessionResponse,
} from "@/types/user-management";

// ── List / Search ──────────────────────────────────────────────────────────

export interface ListUsersParams {
  branchId?: number;
  departmentId?: number;
  role?: string;
  status?: string;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
  dir?: string;
}

export async function listUsers(params: ListUsersParams = {}): Promise<PagedApiResponse<UserResponse[]>> {
  const { data } = await apiClient.get<PagedApiResponse<UserResponse[]>>("/api/v1/users", { params });
  return data;
}

// ── Get ───────────────────────────────────────────────────────────────────

export async function getUser(id: number): Promise<UserResponse> {
  const { data } = await apiClient.get<ApiResponse<UserResponse>>(`/api/v1/users/${id}`);
  return data.data;
}

// ── Create ────────────────────────────────────────────────────────────────

export async function createUser(payload: CreateUserRequest): Promise<UserResponse> {
  const { data } = await apiClient.post<ApiResponse<UserResponse>>("/api/v1/users", payload);
  return data.data;
}

// ── Update ────────────────────────────────────────────────────────────────

export async function updateUser(id: number, payload: UpdateUserRequest): Promise<UserResponse> {
  const { data } = await apiClient.put<ApiResponse<UserResponse>>(`/api/v1/users/${id}`, payload);
  return data.data;
}

// ── Status ────────────────────────────────────────────────────────────────

export async function updateUserStatus(id: number, active: boolean, reason?: string): Promise<void> {
  await apiClient.patch(`/api/v1/users/${id}/status`, { active, reason });
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/users/${id}`);
}

// ── Reset Password ────────────────────────────────────────────────────────

export async function adminResetPassword(id: number, newPassword: string, forceChange = true): Promise<void> {
  await apiClient.post(`/api/v1/users/${id}/reset-password`, { newPassword, forceChange });
}

// ── Bulk Operations ───────────────────────────────────────────────────────

export async function bulkUserOperation(payload: {
  operation: "ACTIVATE" | "DEACTIVATE" | "ASSIGN_ROLE" | "DELETE";
  userIds: number[];
  roleId?: number;
}): Promise<{ succeeded: number; failed: number; errors: string[] }> {
  const { data } = await apiClient.post("/api/v1/users/bulk", payload);
  return data.data;
}

// ── Avatar Upload ─────────────────────────────────────────────────────────

export async function uploadAvatar(id: number, file: File): Promise<UserResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<{ data: UserResponse }>(`/api/v1/users/${id}/avatar`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

// ── Sessions ──────────────────────────────────────────────────────────────

export async function getMySessions(): Promise<UserSessionResponse[]> {
  const { data } = await apiClient.get<ApiResponse<UserSessionResponse[]>>("/api/v1/sessions/me");
  return data.data;
}

export async function revokeSession(sessionId: number): Promise<void> {
  await apiClient.delete(`/api/v1/sessions/me/${sessionId}`);
}

export async function revokeAllSessions(): Promise<void> {
  await apiClient.delete("/api/v1/sessions/me");
}
