import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  Lead,
  LeadSummary,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadListParams,
  LeadStatus,
  LeadStage,
  FollowUp,
  CreateFollowUpRequest,
  AdmissionBooking,
  CreateBookingRequest,
  HandoffRequest,
  BulkImportResult,
  BulkAssignRequest,
  BulkAssignResult,
  LeadActivity,
  Branch,
  TransferBranchRequest,
  LeadTransfer,
  AvailableAction,
  LeadActionRequest,
} from "@/types/lead";

type PagedResponse<T> = ApiResponse<T>;

// ── Leads ────────────────────────────────────────────────────────────────────

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
  const { data } = await apiClient.patch<ApiResponse<Lead>>(`/api/v1/leads/${id}/status`, { status });
  return data.data;
}

export async function assignLead(id: number, callerId: number): Promise<Lead> {
  const { data } = await apiClient.patch<ApiResponse<Lead>>(`/api/v1/leads/${id}/assign`, { callerId });
  return data.data;
}

export async function bulkImportLeads(file: File): Promise<BulkImportResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ApiResponse<BulkImportResult>>("/api/v1/leads/bulk-import", form, {
    headers: { "Content-Type": "multipart/form-data" },
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

export async function unassignLead(id: number): Promise<Lead> {
  const { data } = await apiClient.patch<ApiResponse<Lead>>(`/api/v1/leads/${id}/unassign`);
  return data.data;
}

export async function bulkAssignLeads(request: BulkAssignRequest): Promise<BulkAssignResult> {
  const { data } = await apiClient.post<ApiResponse<BulkAssignResult>>("/api/v1/leads/bulk-assign", request);
  return data.data;
}

export async function listLeadActivities(id: number): Promise<LeadActivity[]> {
  const { data } = await apiClient.get<ApiResponse<LeadActivity[]>>(`/api/v1/leads/${id}/activities`);
  return data.data;
}

// ── Follow-ups ────────────────────────────────────────────────────────────────

export async function listFollowUps(leadId: number): Promise<FollowUp[]> {
  const { data } = await apiClient.get<ApiResponse<FollowUp[]>>(`/api/v1/leads/${leadId}/follow-ups`);
  return data.data;
}

export async function createFollowUp(leadId: number, request: CreateFollowUpRequest): Promise<FollowUp> {
  const { data } = await apiClient.post<ApiResponse<FollowUp>>(`/api/v1/leads/${leadId}/follow-ups`, request);
  return data.data;
}

export async function listPendingFollowUps(): Promise<FollowUp[]> {
  const { data } = await apiClient.get<ApiResponse<FollowUp[]>>("/api/v1/follow-ups/pending");
  return data.data;
}

export async function markFollowUpDone(id: number): Promise<FollowUp> {
  const { data } = await apiClient.patch<ApiResponse<FollowUp>>(`/api/v1/follow-ups/${id}/done`);
  return data.data;
}

// ── Admission Bookings ────────────────────────────────────────────────────────

export async function createBooking(leadId: number, request: CreateBookingRequest): Promise<AdmissionBooking> {
  const { data } = await apiClient.post<ApiResponse<AdmissionBooking>>(`/api/v1/leads/${leadId}/booking`, request);
  return data.data;
}

export async function getLeadBooking(leadId: number): Promise<AdmissionBooking> {
  const { data } = await apiClient.get<ApiResponse<AdmissionBooking>>(`/api/v1/leads/${leadId}/booking`);
  return data.data;
}

export async function uploadPaymentProof(bookingId: number, proofUrl: string): Promise<AdmissionBooking> {
  const { data } = await apiClient.patch<ApiResponse<AdmissionBooking>>(
    `/api/v1/bookings/${bookingId}/payment-proof`,
    null,
    { params: { proofUrl } }
  );
  return data.data;
}

export async function verifyPayment(bookingId: number): Promise<AdmissionBooking> {
  const { data } = await apiClient.patch<ApiResponse<AdmissionBooking>>(`/api/v1/bookings/${bookingId}/verify`);
  return data.data;
}

export async function listBookings(params: { status?: string; page?: number; size?: number } = {}): Promise<PagedResponse<AdmissionBooking[]>> {
  const { data } = await apiClient.get<PagedResponse<AdmissionBooking[]>>("/api/v1/bookings", { params });
  return data;
}

// ── NOT_CONNECTED / Retry Pool ────────────────────────────────────────────────

export async function markNotConnected(id: number): Promise<Lead> {
  const { data } = await apiClient.patch<ApiResponse<Lead>>(`/api/v1/leads/${id}/not-connected`);
  return data.data;
}

export async function listRetryPool(params: { page?: number; size?: number } = {}): Promise<PagedResponse<LeadSummary[]>> {
  const { data } = await apiClient.get<PagedResponse<LeadSummary[]>>("/api/v1/leads/retry-pool", { params });
  return data;
}

export async function claimFromPool(id: number): Promise<Lead> {
  const { data } = await apiClient.post<ApiResponse<Lead>>(`/api/v1/leads/retry-pool/${id}/claim`);
  return data.data;
}

// ── Branch Transfer ───────────────────────────────────────────────────────────

export async function listBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get<ApiResponse<Branch[]>>("/api/v1/leads/branches");
  return data.data;
}

export async function transferToBranch(id: number, request: TransferBranchRequest): Promise<Lead> {
  const { data } = await apiClient.post<ApiResponse<Lead>>(`/api/v1/leads/${id}/transfer-branch`, request);
  return data.data;
}

export async function listLeadTransfers(id: number): Promise<LeadTransfer[]> {
  const { data } = await apiClient.get<ApiResponse<LeadTransfer[]>>(`/api/v1/leads/${id}/transfers`);
  return data.data;
}

// ── Counsellor Handoff (V30) ─────────────────────────────────────────────────

export async function handoffToCounsellor(leadId: number, request: HandoffRequest): Promise<Lead> {
  const { data } = await apiClient.post<ApiResponse<Lead>>(`/api/v1/leads/${leadId}/handoff`, request);
  return data.data;
}

export async function claimWalkIn(leadId: number): Promise<Lead> {
  const { data } = await apiClient.post<ApiResponse<Lead>>(`/api/v1/leads/${leadId}/claim-walk-in`);
  return data.data;
}

// ── Booking cancellation + history (V30) ─────────────────────────────────────

export async function cancelBooking(bookingId: number, reason?: string): Promise<AdmissionBooking> {
  const { data } = await apiClient.patch<ApiResponse<AdmissionBooking>>(
    `/api/v1/bookings/${bookingId}/cancel`,
    null,
    { params: reason ? { reason } : {} }
  );
  return data.data;
}

export async function getLeadBookingHistory(leadId: number): Promise<AdmissionBooking[]> {
  const { data } = await apiClient.get<ApiResponse<AdmissionBooking[]>>(
    `/api/v1/leads/${leadId}/bookings/history`
  );
  return data.data;
}

export interface CounsellorOption {
  id: number;
  firstName: string;
  lastName?: string;
  fullName: string;
  username?: string;
  phone?: string;
}

export async function listCounsellors(): Promise<CounsellorOption[]> {
  const { data } = await apiClient.get<ApiResponse<CounsellorOption[]>>("/api/v1/leads/counsellors");
  return data.data ?? [];
}

/**
 * A guaranteed non-empty, human-readable label for a counsellor dropdown.
 * Uses `||` (not `??`) so blank-but-present names ("") fall through to the next
 * option instead of rendering empty (which made the Select show the raw id).
 */
export function counsellorLabel(c: {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  phone?: string | null;
}): string {
  return (
    c.fullName?.trim() ||
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
    c.username ||
    c.phone ||
    `Counsellor #${c.id}`
  );
}

// ── Action-Driven Workflow ────────────────────────────────────────────────────

export async function getAvailableActions(leadId: number): Promise<AvailableAction[]> {
  const { data } = await apiClient.get<ApiResponse<AvailableAction[]>>(
    `/api/v1/leads/${leadId}/available-actions`
  );
  return data.data ?? [];
}

export async function performLeadAction(
  leadId: number,
  request: LeadActionRequest
): Promise<Lead> {
  const { data } = await apiClient.post<ApiResponse<Lead>>(
    `/api/v1/leads/${leadId}/actions`,
    request
  );
  return data.data;
}

// ── Stage-filtered list ───────────────────────────────────────────────────────
// Convenience wrapper — adds stage param to the standard list call
export async function listLeadsByStage(
  stage: LeadStage | "",
  params: LeadListParams = {}
): Promise<PagedResponse<LeadSummary[]>> {
  const { data } = await apiClient.get<PagedResponse<LeadSummary[]>>("/api/v1/leads", {
    params: { ...params, stage: stage || undefined },
  });
  return data;
}
