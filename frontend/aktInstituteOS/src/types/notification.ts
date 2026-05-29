export type NotificationChannel  = "EMAIL" | "WHATSAPP";
export type NotificationStatus   = "PENDING" | "SENT" | "FAILED";
export type NotificationTemplate_Type =
  | "ADMISSION_CONFIRMATION"
  | "FEE_PAYMENT"
  | "FEE_REMINDER"
  | "BATCH_ASSIGNMENT"
  | "GENERAL";

export interface NotificationLog {
  id: number;
  channel: NotificationChannel;
  templateType?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  subject?: string;
  messagePreview?: string;
  status: NotificationStatus;
  failureReason?: string;
  retryCount: number;
  sentAt?: string;
  relatedType?: string;
  relatedId?: number;
  createdAt: string;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  type: NotificationTemplate_Type;
  channel: string;
  subject?: string;
  body: string;
  variables?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManualSendRequest {
  channel: NotificationChannel;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  subject?: string;
  message: string;
}

export interface BroadcastRequest {
  channel: NotificationChannel;
  message: string;
  subject?: string;
  courseId?: number;
  batchId?: number;
  admissionStatus?: string;
  leadStatus?: string;
  feePendingOnly?: boolean;
}

export interface SaveTemplateRequest {
  name: string;
  type: NotificationTemplate_Type;
  channel: string;
  subject?: string;
  body: string;
  variables?: string;
  isDefault: boolean;
}
