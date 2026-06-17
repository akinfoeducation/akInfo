import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type { RoleResponse, PermissionResponse } from "@/types/user-management";

export async function listRoles(): Promise<RoleResponse[]> {
  const { data } = await apiClient.get<ApiResponse<RoleResponse[]>>("/api/v1/roles");
  return data.data;
}

export async function getRole(id: number): Promise<RoleResponse> {
  const { data } = await apiClient.get<ApiResponse<RoleResponse>>(`/api/v1/roles/${id}`);
  return data.data;
}

export async function createRole(payload: {
  name: string; code: string; description?: string;
  active?: boolean; permissionIds?: number[];
}): Promise<RoleResponse> {
  const { data } = await apiClient.post<ApiResponse<RoleResponse>>("/api/v1/roles", payload);
  return data.data;
}

export async function updateRole(id: number, payload: {
  name: string; code: string; description?: string;
  active?: boolean; permissionIds?: number[];
}): Promise<RoleResponse> {
  const { data } = await apiClient.put<ApiResponse<RoleResponse>>(`/api/v1/roles/${id}`, payload);
  return data.data;
}

export async function assignPermissions(id: number, permissionIds: number[]): Promise<RoleResponse> {
  const { data } = await apiClient.put<ApiResponse<RoleResponse>>(
    `/api/v1/roles/${id}/permissions`, { permissionIds });
  return data.data;
}

export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/roles/${id}`);
}

export async function listPermissions(): Promise<PermissionResponse[]> {
  const { data } = await apiClient.get<ApiResponse<PermissionResponse[]>>("/api/v1/permissions");
  return data.data;
}
