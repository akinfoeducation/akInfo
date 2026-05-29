export type PaymentMode = "CASH" | "UPI" | "CHEQUE" | "BANK_TRANSFER" | "OTHER";

export interface FeePayment {
  id: number;
  uuid: string;
  receiptNumber: string;
  admissionId: number;
  admissionNumber: string;
  studentName: string;
  courseName?: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface FeesSummary {
  collectedToday: number;
  collectedThisMonth: number;
  collectedThisYear: number;
  totalOutstanding: number;
  overdueCount: number;
  paymentsToday: number;
}

export interface CreateFeePaymentRequest {
  admissionId: number;
  amount: number;
  paymentDate?: string;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  notes?: string;
}

export interface FeeListParams {
  admissionId?: number;
  paymentMode?: PaymentMode | "";
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
