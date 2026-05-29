import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  Admission,
  AdmissionSummary,
  CreateAdmissionRequest,
  UpdateAdmissionRequest,
  AdmissionListParams,
  AdmissionStatus,
  EnrollStudentRequest,
} from "@/types/admission";

type PagedResponse<T> = ApiResponse<T>;

export async function listAdmissions(params: AdmissionListParams = {}): Promise<PagedResponse<AdmissionSummary[]>> {
  const { data } = await apiClient.get<PagedResponse<AdmissionSummary[]>>("/api/v1/admissions", { params });
  return data;
}

export async function getAdmission(id: number): Promise<Admission> {
  const { data } = await apiClient.get<ApiResponse<Admission>>(`/api/v1/admissions/${id}`);
  return data.data;
}

export async function createAdmission(request: CreateAdmissionRequest): Promise<Admission> {
  const { data } = await apiClient.post<ApiResponse<Admission>>("/api/v1/admissions", request);
  return data.data;
}

export async function updateAdmission(id: number, request: UpdateAdmissionRequest): Promise<Admission> {
  const { data } = await apiClient.put<ApiResponse<Admission>>(`/api/v1/admissions/${id}`, request);
  return data.data;
}

export async function updateAdmissionStatus(id: number, status: AdmissionStatus): Promise<Admission> {
  const { data } = await apiClient.patch<ApiResponse<Admission>>(`/api/v1/admissions/${id}/status`, {
    status,
  });
  return data.data;
}

export async function enrollAdmission(id: number, request: EnrollStudentRequest): Promise<Admission> {
  const { data } = await apiClient.post<ApiResponse<Admission>>(`/api/v1/admissions/${id}/enroll`, request);
  return data.data;
}

export async function deleteAdmission(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/admissions/${id}`);
}
