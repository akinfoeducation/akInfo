import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  Student,
  StudentSummary,
  CreateStudentRequest,
  UpdateStudentRequest,
  DuplicateCheckResponse,
  StudentListParams,
  StudentStatus,
} from "@/types/student";

type PagedResponse<T> = ApiResponse<T>;

export async function listStudents(params: StudentListParams = {}): Promise<PagedResponse<StudentSummary[]>> {
  const { data } = await apiClient.get<PagedResponse<StudentSummary[]>>("/api/v1/students", {
    params,
  });
  return data;
}

export async function searchStudents(params: {
  q: string;
  status?: StudentStatus | "";
  page?: number;
  size?: number;
}): Promise<PagedResponse<StudentSummary[]>> {
  const { data } = await apiClient.get<PagedResponse<StudentSummary[]>>("/api/v1/students/search", {
    params,
  });
  return data;
}

export async function getStudent(id: number): Promise<Student> {
  const { data } = await apiClient.get<ApiResponse<Student>>(`/api/v1/students/${id}`);
  return data.data;
}

export async function createStudent(request: CreateStudentRequest): Promise<Student> {
  const { data } = await apiClient.post<ApiResponse<Student>>("/api/v1/students", request);
  return data.data;
}

export async function updateStudent(id: number, request: UpdateStudentRequest): Promise<Student> {
  const { data } = await apiClient.put<ApiResponse<Student>>(`/api/v1/students/${id}`, request);
  return data.data;
}

export async function updateStudentStatus(id: number, status: StudentStatus): Promise<Student> {
  const { data } = await apiClient.patch<ApiResponse<Student>>(`/api/v1/students/${id}/status`, {
    status,
  });
  return data.data;
}

export async function deleteStudent(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/students/${id}`);
}

export async function checkDuplicate(
  phone?: string,
  email?: string
): Promise<DuplicateCheckResponse> {
  const params: Record<string, string> = {};
  if (phone) params.phone = phone;
  if (email) params.email = email;
  const { data } = await apiClient.get<ApiResponse<DuplicateCheckResponse>>(
    "/api/v1/students/check-duplicate",
    { params }
  );
  return data.data;
}

export async function uploadStudentDocument(
  studentId: number,
  file: File,
  documentType: "AADHAAR" | "PAN" | "PHOTO" | "OTHER"
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  form.append("documentType", documentType);
  await apiClient.post(
    `/api/v1/students/${studentId}/documents`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
}

export async function uploadStudentPhoto(id: number, file: File): Promise<Student> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ApiResponse<Student>>(
    `/api/v1/students/${id}/photo`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.data;
}
