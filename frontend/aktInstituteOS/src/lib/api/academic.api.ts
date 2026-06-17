import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  FacultyProfileResponse, FacultyProfileRequest,
  TimetableResponse, TimetableRequest,
  ClassSessionResponse, ClassSessionRequest,
  StudentAttendanceResponse, AttendanceSummaryResponse, MarkAttendanceRequest,
  StudyMaterialResponse,
  StudentPortalDashboard,
} from "@/types/academic";

// ── Faculty ───────────────────────────────────────────────────────────────────

export async function listFaculty(): Promise<FacultyProfileResponse[]> {
  const { data } = await apiClient.get<ApiResponse<FacultyProfileResponse[]>>("/api/v1/faculty");
  return data.data;
}

export async function getMyFacultyProfile(): Promise<FacultyProfileResponse> {
  const { data } = await apiClient.get<ApiResponse<FacultyProfileResponse>>("/api/v1/faculty/me");
  return data.data;
}

export async function upsertFacultyProfile(userId: number, payload: FacultyProfileRequest): Promise<FacultyProfileResponse> {
  const { data } = await apiClient.put<ApiResponse<FacultyProfileResponse>>(`/api/v1/faculty/user/${userId}`, payload);
  return data.data;
}

export async function updateMyFacultyProfile(payload: FacultyProfileRequest): Promise<FacultyProfileResponse> {
  const { data } = await apiClient.put<ApiResponse<FacultyProfileResponse>>("/api/v1/faculty/me", payload);
  return data.data;
}

// ── Timetable ─────────────────────────────────────────────────────────────────

export async function listTimetable(params?: { batchId?: number; facultyUserId?: number }): Promise<TimetableResponse[]> {
  const { data } = await apiClient.get<ApiResponse<TimetableResponse[]>>("/api/v1/timetable", { params });
  return data.data;
}

export async function getTodayTimetable(facultyUserId?: number): Promise<TimetableResponse[]> {
  const { data } = await apiClient.get<ApiResponse<TimetableResponse[]>>("/api/v1/timetable/today", {
    params: facultyUserId ? { facultyUserId } : {},
  });
  return data.data;
}

export async function getMyTimetable(): Promise<TimetableResponse[]> {
  const { data } = await apiClient.get<ApiResponse<TimetableResponse[]>>("/api/v1/timetable/my");
  return data.data;
}

export async function createTimetableSlot(payload: TimetableRequest): Promise<TimetableResponse> {
  const { data } = await apiClient.post<ApiResponse<TimetableResponse>>("/api/v1/timetable", payload);
  return data.data;
}

export async function updateTimetableSlot(id: number, payload: TimetableRequest): Promise<TimetableResponse> {
  const { data } = await apiClient.put<ApiResponse<TimetableResponse>>(`/api/v1/timetable/${id}`, payload);
  return data.data;
}

export async function deleteTimetableSlot(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/timetable/${id}`);
}

// ── Class Sessions ────────────────────────────────────────────────────────────

export async function listSessions(params?: {
  batchId?: number; facultyUserId?: number; from?: string; to?: string;
}): Promise<ClassSessionResponse[]> {
  const { data } = await apiClient.get<ApiResponse<ClassSessionResponse[]>>("/api/v1/sessions", { params });
  return data.data;
}

export async function getSession(id: number): Promise<ClassSessionResponse> {
  const { data } = await apiClient.get<ApiResponse<ClassSessionResponse>>(`/api/v1/sessions/${id}`);
  return data.data;
}

export async function createSession(payload: ClassSessionRequest): Promise<ClassSessionResponse> {
  const { data } = await apiClient.post<ApiResponse<ClassSessionResponse>>("/api/v1/sessions", payload);
  return data.data;
}

export async function updateSession(id: number, payload: ClassSessionRequest): Promise<ClassSessionResponse> {
  const { data } = await apiClient.put<ApiResponse<ClassSessionResponse>>(`/api/v1/sessions/${id}`, payload);
  return data.data;
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function getSessionRoster(sessionId: number): Promise<StudentAttendanceResponse[]> {
  const { data } = await apiClient.get<ApiResponse<StudentAttendanceResponse[]>>(
    `/api/v1/attendance/sessions/${sessionId}`
  );
  return data.data;
}

export async function markAttendance(sessionId: number, payload: MarkAttendanceRequest): Promise<void> {
  await apiClient.post(`/api/v1/attendance/sessions/${sessionId}/mark`, payload);
}

export async function getStudentAttendanceHistory(studentId: number, params?: { from?: string; to?: string }): Promise<StudentAttendanceResponse[]> {
  const { data } = await apiClient.get<ApiResponse<StudentAttendanceResponse[]>>(
    `/api/v1/attendance/students/${studentId}`, { params }
  );
  return data.data;
}

export async function getStudentAttendanceSummary(studentId: number): Promise<AttendanceSummaryResponse> {
  const { data } = await apiClient.get<ApiResponse<AttendanceSummaryResponse>>(
    `/api/v1/attendance/students/${studentId}/summary`
  );
  return data.data;
}

export async function getBatchAttendanceSummary(batchId: number): Promise<AttendanceSummaryResponse[]> {
  const { data } = await apiClient.get<ApiResponse<AttendanceSummaryResponse[]>>(
    `/api/v1/attendance/batches/${batchId}/summary`
  );
  return data.data;
}

// ── Study Materials ───────────────────────────────────────────────────────────

export async function listMaterials(params?: { batchId?: number; courseId?: number; type?: string }): Promise<StudyMaterialResponse[]> {
  const { data } = await apiClient.get<ApiResponse<StudyMaterialResponse[]>>("/api/v1/materials", { params });
  return data.data;
}

export async function addMaterialLink(params: {
  batchId?: number; courseId?: number; subject?: string;
  title: string; description?: string; materialType?: string; externalLink: string;
}): Promise<StudyMaterialResponse> {
  const { data } = await apiClient.post<ApiResponse<StudyMaterialResponse>>("/api/v1/materials/link", null, { params });
  return data.data;
}

export async function uploadMaterialFile(
  file: File,
  params: { batchId?: number; courseId?: number; subject?: string; title: string; description?: string; materialType?: string }
): Promise<StudyMaterialResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ApiResponse<StudyMaterialResponse>>(
    "/api/v1/materials/upload", form,
    { params, headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.data;
}

export async function deleteMaterial(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/materials/${id}`);
}

// ── Student Portal ────────────────────────────────────────────────────────────

export async function activateStudentPortal(studentId: number, password: string): Promise<void> {
  await apiClient.post(`/api/v1/portal/students/${studentId}/activate`, { password });
}

export async function getPortalStatus(studentId: number): Promise<boolean> {
  const { data } = await apiClient.get<ApiResponse<boolean>>(`/api/v1/portal/students/${studentId}/status`);
  return data.data;
}

export async function getPortalDashboard(): Promise<StudentPortalDashboard> {
  const { data } = await apiClient.get<ApiResponse<StudentPortalDashboard>>("/api/v1/portal/me");
  return data.data;
}

export async function getPortalAttendance(params?: { from?: string; to?: string }): Promise<StudentAttendanceResponse[]> {
  const { data } = await apiClient.get<ApiResponse<StudentAttendanceResponse[]>>("/api/v1/portal/me/attendance", { params });
  return data.data;
}

export async function getPortalAttendanceSummary(): Promise<AttendanceSummaryResponse> {
  const { data } = await apiClient.get<ApiResponse<AttendanceSummaryResponse>>("/api/v1/portal/me/attendance/summary");
  return data.data;
}

export async function getPortalMaterials(): Promise<StudyMaterialResponse[]> {
  const { data } = await apiClient.get<ApiResponse<StudyMaterialResponse[]>>("/api/v1/portal/me/materials");
  return data.data;
}

export async function getPortalSchedule(): Promise<import("@/types/academic").TimetableResponse[]> {
  const { data } = await apiClient.get<ApiResponse<import("@/types/academic").TimetableResponse[]>>("/api/v1/portal/me/schedule");
  return data.data;
}
