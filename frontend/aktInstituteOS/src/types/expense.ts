export interface Expense {
  id: number;
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  paidTo?: string | null;
  paymentMode?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdByName?: string;
  createdAt?: string;
}

export interface CreateExpenseRequest {
  category: string;
  description: string;
  amount: number;
  expenseDate?: string;   // yyyy-MM-dd — defaults to today on the backend
  paidTo?: string;
  paymentMode?: string;   // defaults to CASH on the backend
  referenceNumber?: string;
  notes?: string;
}

export interface ExpenseListParams {
  category?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  size?: number;
}

/** Common expense categories (free-text on the backend; these drive the dropdown). */
export const EXPENSE_CATEGORIES = [
  "Salaries",
  "Rent",
  "Utilities",
  "Marketing",
  "Infrastructure",
  "Stationery",
  "Maintenance",
  "Equipment",
  "Travel",
  "Other",
] as const;
