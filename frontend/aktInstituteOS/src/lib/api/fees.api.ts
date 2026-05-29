import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  FeePayment,
  FeesSummary,
  CreateFeePaymentRequest,
  FeeListParams,
} from "@/types/fees";

export async function getFeesSummary(): Promise<FeesSummary> {
  const { data } = await apiClient.get<ApiResponse<FeesSummary>>("/api/v1/fees/summary");
  return data.data;
}

export async function listPayments(params: FeeListParams = {}): Promise<ApiResponse<FeePayment[]>> {
  const { data } = await apiClient.get<ApiResponse<FeePayment[]>>("/api/v1/fees", { params });
  return data;
}

export async function collectPayment(request: CreateFeePaymentRequest): Promise<FeePayment> {
  const { data } = await apiClient.post<ApiResponse<FeePayment>>("/api/v1/fees", request);
  return data.data;
}

export async function cancelPayment(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/fees/${id}`);
}
