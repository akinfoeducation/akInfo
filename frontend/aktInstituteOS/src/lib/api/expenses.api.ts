import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type { Expense, CreateExpenseRequest, ExpenseListParams } from "@/types/expense";

export async function listExpenses(params: ExpenseListParams = {}): Promise<ApiResponse<Expense[]>> {
  const { data } = await apiClient.get<ApiResponse<Expense[]>>("/api/v1/expenses", { params });
  return data;
}

export async function createExpense(request: CreateExpenseRequest): Promise<Expense> {
  const { data } = await apiClient.post<ApiResponse<Expense>>("/api/v1/expenses", request);
  return data.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/expenses/${id}`);
}
