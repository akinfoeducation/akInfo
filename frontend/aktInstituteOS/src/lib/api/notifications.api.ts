import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  NotificationLog,
  NotificationTemplate,
  ManualSendRequest,
  BroadcastRequest,
  SaveTemplateRequest,
} from "@/types/notification";

// ── Logs ──────────────────────────────────────────────────────────────────────

export async function listNotificationLogs(params?: {
  channel?: string;
  status?: string;
  page?: number;
  size?: number;
}): Promise<ApiResponse<NotificationLog[]>> {
  const { data } = await apiClient.get<ApiResponse<NotificationLog[]>>(
    "/api/v1/notifications/logs",
    { params },
  );
  return data;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<NotificationTemplate[]> {
  const { data } = await apiClient.get<ApiResponse<NotificationTemplate[]>>(
    "/api/v1/notifications/templates",
  );
  return data.data;
}

export async function createTemplate(req: SaveTemplateRequest): Promise<NotificationTemplate> {
  const { data } = await apiClient.post<ApiResponse<NotificationTemplate>>(
    "/api/v1/notifications/templates",
    req,
  );
  return data.data;
}

export async function updateTemplate(id: number, req: SaveTemplateRequest): Promise<NotificationTemplate> {
  const { data } = await apiClient.put<ApiResponse<NotificationTemplate>>(
    `/api/v1/notifications/templates/${id}`,
    req,
  );
  return data.data;
}

export async function deleteTemplate(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/notifications/templates/${id}`);
}

// ── Send ──────────────────────────────────────────────────────────────────────

export async function sendManualNotification(req: ManualSendRequest): Promise<void> {
  await apiClient.post("/api/v1/notifications/send", req);
}

export async function sendBroadcast(req: BroadcastRequest): Promise<void> {
  await apiClient.post("/api/v1/notifications/broadcast", req);
}
