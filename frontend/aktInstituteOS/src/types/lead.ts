export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "FOLLOW_UP"
  | "DEMO_SCHEDULED"
  | "NEGOTIATION"
  | "CONVERTED"
  | "LOST";

export type LeadSource =
  | "WALK_IN"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "WEBSITE"
  | "GOOGLE_ADS"
  | "OTHER";

export interface Lead {
  id: number;
  uuid: string;
  instituteId: number;
  admissionId?: number;
  firstName: string;
  lastName?: string;
  fullName: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  courseInterested?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedToId?: number;
  notes?: string;
  nextFollowUpAt?: string;
  lastContactedAt?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadSummary {
  id: number;
  uuid: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  phone: string;
  email?: string;
  courseInterested?: string;
  source: LeadSource;
  status: LeadStatus;
  nextFollowUpAt?: string;
  lastContactedAt?: string;
  createdAt: string;
}

export interface CreateLeadRequest {
  firstName: string;
  lastName?: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  courseInterested?: string;
  source?: LeadSource;
  assignedToId?: number;
  notes?: string;
  nextFollowUpAt?: string;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {}

export interface LeadListParams {
  page?: number;
  size?: number;
  sort?: string;
  dir?: string;
  status?: LeadStatus | "";
  source?: LeadSource | "";
  q?: string;
}
