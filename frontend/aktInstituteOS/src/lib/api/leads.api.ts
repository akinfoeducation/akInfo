import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  Lead,
  LeadSummary,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadListParams,
  LeadStatus,
} from "@/types/lead";

type PagedResponse<T> = ApiResponse<T>;

export async function listLeads(params: LeadListParams = {}): Promise<PagedResponse<LeadSummary[]>> {
  const { data } = await apiClient.get<PagedResponse<LeadSummary[]>>("/api/v1/leads", { params });
  return data;
}

export async function getLead(id: number): Promise<Lead> {
  const { data } = await apiClient.get<ApiResponse<Lead>>(`/api/v1/leads/${id}`);
  return data.data;
}

export async function createLead(request: CreateLeadRequest): Promise<Lead> {
  const { data } = await apiClient.post<ApiResponse<Lead>>("/api/v1/leads", request);
  return data.data;
}

export async function updateLead(id: number, request: UpdateLeadRequest): Promise<Lead> {
  const { data } = await apiClient.put<ApiResponse<Lead>>(`/api/v1/leads/${id}`, request);
  return data.data;
}

export async function updateLeadStatus(id: number, status: LeadStatus): Promise<Lead> {
  const { data } = await apiClient.patch<ApiResponse<Lead>>(`/api/v1/leads/${id}/status`, {
    status,
  });
  return data.data;
}

export async function convertLead(id: number): Promise<Lead> {
  const { data } = await apiClient.post<ApiResponse<Lead>>(`/api/v1/leads/${id}/convert`);
  return data.data;
}

export async function deleteLead(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/leads/${id}`);
}
