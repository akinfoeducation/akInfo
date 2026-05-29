import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  Course,
  CourseSummary,
  Batch,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateBatchRequest,
  UpdateBatchRequest,
  CourseStatus,
} from "@/types/course";

export async function listCourses(status?: CourseStatus | ""): Promise<ApiResponse<CourseSummary[]>> {
  const { data } = await apiClient.get<ApiResponse<CourseSummary[]>>("/api/v1/courses", {
    params: status ? { status } : {},
  });
  return data;
}

export async function getCourse(id: number): Promise<Course> {
  const { data } = await apiClient.get<ApiResponse<Course>>(`/api/v1/courses/${id}`);
  return data.data;
}

export async function createCourse(request: CreateCourseRequest): Promise<Course> {
  const { data } = await apiClient.post<ApiResponse<Course>>("/api/v1/courses", request);
  return data.data;
}

export async function updateCourse(id: number, request: UpdateCourseRequest): Promise<Course> {
  const { data } = await apiClient.put<ApiResponse<Course>>(`/api/v1/courses/${id}`, request);
  return data.data;
}

export async function deleteCourse(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/courses/${id}`);
}

// ── Batches ────────────────────────────────────────────────────────────────

export async function listBatches(courseId: number): Promise<Batch[]> {
  const { data } = await apiClient.get<ApiResponse<Batch[]>>(`/api/v1/courses/${courseId}/batches`);
  return data.data;
}

export async function createBatch(courseId: number, request: CreateBatchRequest): Promise<Batch> {
  const { data } = await apiClient.post<ApiResponse<Batch>>(
    `/api/v1/courses/${courseId}/batches`, request
  );
  return data.data;
}

export async function updateBatch(courseId: number, batchId: number, request: UpdateBatchRequest): Promise<Batch> {
  const { data } = await apiClient.put<ApiResponse<Batch>>(
    `/api/v1/courses/${courseId}/batches/${batchId}`, request
  );
  return data.data;
}

export async function deleteBatch(courseId: number, batchId: number): Promise<void> {
  await apiClient.delete(`/api/v1/courses/${courseId}/batches/${batchId}`);
}

export async function listBatchesByCourse(courseId: number): Promise<import("@/types/course").Batch[]> {
  const { data } = await apiClient.get<ApiResponse<import("@/types/course").Batch[]>>("/api/v1/batches", {
    params: { courseId },
  });
  return data.data;
}
