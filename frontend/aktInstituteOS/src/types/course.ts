export type CourseStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type BatchStatus  = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type BatchMode    = "ONLINE" | "OFFLINE" | "HYBRID";

export interface Batch {
  id: number;
  uuid: string;
  courseId: number;
  courseName?: string;
  courseCode?: string;
  name: string;
  batchCode?: string;
  mode?: BatchMode;
  facultyName?: string;
  timing?: string;
  startDate?: string;
  endDate?: string;
  maxCapacity?: number;
  enrolledCount: number;
  availableSeats: number;
  status: BatchStatus;
  createdAt: string;
}

export interface BatchDashboard {
  totalBatches: number;
  activeBatches: number;
  plannedBatches: number;
  completedBatches: number;
  cancelledBatches: number;
  totalEnrolled: number;
  active: Batch[];
  upcoming: Batch[];
}

export interface BatchStudentRow {
  admissionId: number;
  admissionNumber: string;
  studentName: string;
  phone: string;
  admissionStatus: string;
  feesAgreed: number;
  feesPaid: number;
  feesDue: number;
  enrollmentDate?: string;
}

export interface BatchAssignmentHistory {
  id: number;
  admissionId: number;
  fromBatchId?: number;
  fromBatchName?: string;
  toBatchId?: number;
  toBatchName?: string;
  action: "ASSIGNED" | "TRANSFERRED" | "REMOVED";
  notes?: string;
  createdAt: string;
  createdByName?: string;
}

export interface Course {
  id: number;
  uuid: string;
  name: string;
  code: string;
  description?: string;
  durationWeeks?: number;
  fees: number;
  status: CourseStatus;
  batches?: Batch[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseSummary {
  id: number;
  uuid: string;
  name: string;
  code: string;
  durationWeeks?: number;
  fees: number;
  status: CourseStatus;
  batchCount: number;
  createdAt: string;
}

export interface CreateCourseRequest {
  name: string;
  code: string;
  description?: string;
  durationWeeks?: number;
  fees?: number;
}

export interface UpdateCourseRequest {
  name?: string;
  description?: string;
  durationWeeks?: number;
  fees?: number;
  status?: CourseStatus;
}

export interface CreateBatchRequest {
  name: string;
  batchCode?: string;
  mode?: BatchMode;
  facultyName?: string;
  timing?: string;
  startDate?: string;
  endDate?: string;
  maxCapacity?: number;
}

export interface UpdateBatchRequest extends Partial<CreateBatchRequest> {
  status?: BatchStatus;
}
