// ── Stage — coarse pipeline position ────────────────────────────────────────
export type LeadStage =
  | "CALLER_PIPELINE"       // Caller is working the lead
  | "COUNSELLOR_PIPELINE"   // Counsellor owns after handoff/walk-in
  | "ADMITTED"              // Fully enrolled
  | "DEAD";                 // Dropped out at any stage

// ── Named actions (action-driven workflow) ───────────────────────────────────
export type LeadAction =
  // Caller
  | "MARK_CONTACTED"
  | "MARK_INTERESTED"
  | "REQUEST_CALLBACK"
  | "SCHEDULE_FOLLOW_UP"
  | "PLAN_VISIT"
  | "RESCHEDULE_VISIT"
  | "CONFIRM_REMOTE_ADMISSION"
  | "CALL_NOT_CONNECTED"
  | "MARK_NOT_INTERESTED"
  | "MARK_NOT_REACHABLE"
  | "TRANSFER_BRANCH"
  | "STUDENT_VISITED"
  // Counsellor
  | "CONFIRM_VISIT"
  | "SCHEDULE_POST_VISIT_FOLLOWUP"
  | "START_NEGOTIATION"
  | "REQUEST_DOCUMENTS"
  | "MARK_DOCUMENTS_RECEIVED"
  | "START_ADMISSION"
  | "COMPLETE_ADMISSION"
  // Admin only
  | "ADMIN_STATUS_OVERRIDE"
  | "REASSIGN_COUNSELLOR";

// ── Available action button (returned by GET /available-actions) ─────────────
export interface AvailableAction {
  action: LeadAction;
  label: string;
  primary: boolean;
  group: string;
  requiresInput: boolean;
}

// ── Action request (sent to POST /actions) ───────────────────────────────────
export interface LeadActionRequest {
  action: LeadAction;
  visitDate?: string;
  followUpAt?: string;
  reason?: string;
  counsellorId?: number;
  branchId?: number;
  overrideStatus?: string;
  notes?: string;
  outcome?: string;
}

// ── Pre-visit statuses (Caller owns) ────────────────────────────────────────
// ── Post-visit statuses (Counsellor owns) ───────────────────────────────────
// ── Terminal statuses ────────────────────────────────────────────────────────
export type LeadStatus =
  // Pre-visit — caller owns
  | "NEW_LEAD"
  | "ASSIGNED"
  | "CONTACTED"
  | "INTERESTED"
  | "FOLLOW_UP"
  | "CALLBACK"
  | "VISIT_PLANNED"
  | "NOT_CONNECTED"
  | "NOT_INTERESTED"
  | "NOT_REACHABLE"
  | "ADMISSION_INTERESTED"
  | "PAYMENT_PENDING"
  | "PAYMENT_VERIFIED"
  | "BOOKING_CONFIRMED"
  | "VISIT_PENDING"          // Scenario B: booking confirmed, physical visit still pending
  // Post-visit — counsellor owns
  | "VISIT_DONE"
  | "FOLLOW_UP_AFTER_VISIT"
  | "NEGOTIATION"
  | "DOCUMENT_PENDING"       // awaiting documents (esp. ONLINE)
  | "ADMISSION_IN_PROGRESS"  // admission being created
  // Terminal
  | "ADMISSION_DONE"
  | "CLOSED";

export type DeliveryMode = "ONLINE" | "OFFLINE";

export type LeadSource =
  | "WALK_IN"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "WEBSITE"
  | "GOOGLE_ADS"
  | "PHONE"
  | "ONLINE"
  | "OTHER";

export type CurrentWork = "JOB" | "FARMER" | "STUDENT" | "BUSINESS" | "NO_WORK";
export type InterestedFor = "JOB" | "ABROAD" | "HOBBY" | "BUSINESS" | "JOB_AND_BUSINESS";

export type BookingType = "REMOTE_TOKEN" | "ADMISSION_CLOSING";

export interface Lead {
  id: number;
  uuid: string;
  instituteId: number;
  admissionId?: number;
  bookingId?: number;
  stage?: LeadStage;
  firstName: string;
  lastName?: string;
  fullName: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  courseInterested?: string;
  source: LeadSource;
  status: LeadStatus;
  // Delivery mode (V32)
  deliveryMode?: DeliveryMode;
  preferredBatch?: string;
  preferredBranch?: string;
  // Parent info (V32)
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  assignedToId?: number;
  assignedAt?: string;
  address?: string;
  currentWork?: CurrentWork;
  interestedFor?: InterestedFor;
  notes?: string;
  nextFollowUpAt?: string;
  lastContactedAt?: string;
  convertedAt?: string;
  notConnectedAt?: string;
  previousCallerId?: number;
  branchId?: number;
  // Dual ownership (V30)
  callerId?: number;
  counsellorId?: number;
  handedOffAt?: string;
  visitPlannedAt?: string;
  visitDoneAt?: string;
  bookingConfirmedAt?: string;
  admissionDoneAt?: string;
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
  stage?: LeadStage;
  assignedToId?: number;
  assignedAt?: string;
  callerId?: number;
  counsellorId?: number;
  currentWork?: CurrentWork;
  interestedFor?: InterestedFor;
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
  address?: string;
  currentWork?: CurrentWork;
  interestedFor?: InterestedFor;
  notes?: string;
  nextFollowUpAt?: string;
}

export interface UpdateLeadRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  courseInterested?: string;
  source?: LeadSource;
  address?: string;
  currentWork?: CurrentWork;
  interestedFor?: InterestedFor;
  notes?: string;
  nextFollowUpAt?: string;
}

export interface LeadListParams {
  page?: number;
  size?: number;
  sort?: string;
  dir?: string;
  stage?: LeadStage | "";
  status?: LeadStatus | "";
  source?: LeadSource | "";
  assignedToId?: number;
  from?: string;   // yyyy-MM-dd
  to?: string;     // yyyy-MM-dd
  q?: string;
}

export interface FollowUp {
  id: number;
  leadId: number;
  scheduledAt: string;
  remarks?: string;
  done: boolean;
  completedAt?: string;
  createdBy?: number;
  createdAt: string;
}

export interface CreateFollowUpRequest {
  scheduledAt: string;
  remarks?: string;
}

export interface AdmissionBooking {
  id: number;
  uuid: string;
  leadId: number;
  batchId: number;
  batchName?: string;
  paymentAmount?: number;
  paymentProofUrl?: string;
  paymentProofUploadedAt?: string;
  bookingStatus: "PAYMENT_PENDING" | "PAYMENT_VERIFIED" | "BOOKING_CONFIRMED" | "CANCELLED";
  paymentVerifiedBy?: number;
  paymentVerifiedAt?: string;
  notes?: string;
  // V30 fields
  bookingType?: BookingType;
  active?: boolean;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined applicant details (present on list/queue responses)
  leadName?: string;
  leadPhone?: string;
}

export interface CreateBookingRequest {
  batchId: number;
  paymentAmount?: number;
  notes?: string;
  bookingType?: BookingType;
}

export interface HandoffRequest {
  counsellorId: number;
  notes?: string;
}

export interface BulkImportResult {
  totalRows: number;
  createdRows: number;
  duplicateRows: number;
  invalidRows: number;
  errors: string[];
}

export interface BulkAssignRequest {
  leadIds: number[];
  callerId: number;
}

export interface BulkAssignResult {
  requested: number;
  assigned: number;
  reassigned: number;
  skipped: number;
  notFound: number;
  errors: string[];
}

export interface LeadActivity {
  id: number;
  actionType: string;
  leadAction?: string;       // LeadAction enum value (null for legacy entries)
  actionCategory?: string;   // CALL, STATUS, HANDOFF, etc.
  outcome?: string;          // REACHED, NOT_CONNECTED, INTERESTED, etc.
  description?: string;
  performedBy?: number;
  performedByName?: string;
  createdAt: string;
}

// ── Retry Pool ──────────────────────────────────────────────────────────────

export interface RetryPoolParams {
  page?: number;
  size?: number;
}

// ── Branch Transfer ─────────────────────────────────────────────────────────

export interface Branch {
  id: number;
  uuid?: string;
  instituteId?: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransferBranchRequest {
  branchId: number;
  notes?: string;
}

export interface LeadTransfer {
  id: number;
  transferType: string;
  fromCallerId?: number;
  toCallerId?: number;
  toBranchId?: number;
  toBranchName?: string;
  notes?: string;
  transferredAt: string;
  transferredBy?: number;
}
