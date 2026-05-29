export type StudentStatus = "ACTIVE" | "INACTIVE" | "GRADUATED" | "DROPPED";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type DocumentType = "PHOTO" | "AADHAAR" | "MARKSHEET" | "CERTIFICATE" | "OTHER";

export interface StudentDocument {
  id: number;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSizeBytes?: number;
  mimeType?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Student {
  id: number;
  uuid: string;
  studentNumber: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  photoUrl?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  emergencyContact?: string;
  highestQualification?: string;
  schoolCollegeName?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  status: StudentStatus;
  leadId?: number;
  notes?: string;
  instituteId: number;
  documents?: StudentDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentSummary {
  id: number;
  studentNumber: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  status: StudentStatus;
  photoUrl?: string;
  createdAt: string;
}

export interface CreateStudentRequest {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
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
  leadId?: number;
}

export interface UpdateStudentRequest extends Partial<CreateStudentRequest> {}

export interface DuplicateCheckResponse {
  phoneExists: boolean;
  emailExists: boolean;
  isDuplicate: boolean;
}

export interface StudentListParams {
  page?: number;
  size?: number;
  sort?: string;
  dir?: string;
  status?: StudentStatus | "";
  q?: string;
}
