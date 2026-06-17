import apiClient from "./client";
import type { PagedApiResponse } from "@/types/api";

export interface AuditLogEntry {
  id: number;
  instituteId: number;
  userId: number;
  userDisplayName: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditListParams {
  action?: string;
  entityType?: string;
  userId?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export async function listAuditLogs(params: AuditListParams = {}): Promise<PagedApiResponse<AuditLogEntry[]>> {
  const { data } = await apiClient.get<PagedApiResponse<AuditLogEntry[]>>("/api/v1/audit", { params });
  return data;
}
