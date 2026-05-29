export type AdmissionStatus =
  | "PENDING"
  | "DOCUMENTS_PENDING"
  | "ENROLLED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface Admission {
  id: number;
  uuid: string;
  admissionNumber: string;
  leadId: number;
  studentId?: number;
  firstName: string;
  lastName?: string;
  fullName: string;
  phone: string;
  email?: string;
  courseName?: string;
  batchId?: number;
  batchName?: string;
  feesAgreed: number;
  feesPaid: number;
  feesDue: number;
  enrollmentDate?: string;
  status: AdmissionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionSummary {
  id: number;
  admissionNumber: string;
  leadId: number;
  studentId?: number;
  fullName: string;
  phone: string;
  courseName?: string;
  batchName?: string;
  feesAgreed: number;
  feesPaid: number;
  feesDue: number;
  enrollmentDate?: string;
  status: AdmissionStatus;
  createdAt: string;
}

export interface CreateAdmissionRequest {
  leadId: number;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  courseName?: string;
  batchId?: number;
  batchName?: string;
  feesAgreed?: number;
  enrollmentDate?: string;
  notes?: string;
}

export interface UpdateAdmissionRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  courseName?: string;
  batchName?: string;
  feesAgreed?: number;
  feesPaid?: number;
  enrollmentDate?: string;
  notes?: string;
}

export interface EnrollStudentRequest {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  whatsappNumber?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  emergencyContact?: string;
  highestQualification?: string;
  schoolCollegeName?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  notes?: string;
}

export interface AdmissionListParams {
  page?: number;
  size?: number;
  sort?: string;
  dir?: string;
  status?: AdmissionStatus | "";
  q?: string;
}
