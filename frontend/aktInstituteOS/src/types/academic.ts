// ── Faculty ───────────────────────────────────────────────────────────────────

export interface FacultyProfileResponse {
  id: number;
  userId: number;
  instituteId: number;
  firstName: string;
  lastName?: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  designation?: string;
  employeeId?: string;
  username: string;
  qualification?: string;
  experienceYears: number;
  subjects?: string;
  skills?: string;
  employeeType: "FULL_TIME" | "PART_TIME" | "VISITING" | "CONTRACT";
  bio?: string;
  linkedinUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacultyProfileRequest {
  qualification?: string;
  experienceYears?: number;
  subjects?: string;
  skills?: string;
  employeeType?: string;
  bio?: string;
  linkedinUrl?: string;
}

// ── Timetable ─────────────────────────────────────────────────────────────────

export interface TimetableResponse {
  id: number;
  uuid: string;
  batchId: number;
  batchName?: string;
  facultyUserId?: number;
  facultyName?: string;
  subject?: string;
  dayOfWeek?: number;
  dayName?: string;
  specificDate?: string;
  startTime: string;
  endTime: string;
  classroom?: string;
  mode: "OFFLINE" | "ONLINE" | "HYBRID";
  onlineLink?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  active: boolean;
  createdAt: string;
}

export interface TimetableRequest {
  batchId: number;
  facultyUserId?: number;
  subject?: string;
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  classroom?: string;
  mode?: string;
  onlineLink?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
}

// ── Class Sessions ────────────────────────────────────────────────────────────

export interface ClassSessionResponse {
  id: number;
  uuid: string;
  batchId: number;
  batchName?: string;
  timetableId?: number;
  facultyUserId?: number;
  facultyName?: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  subject?: string;
  topicCovered?: string;
  sessionNotes?: string;
  homeworkNotes?: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "HOLIDAY";
  attendanceMarked: boolean;
  presentCount: number;
  totalStudents: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSessionRequest {
  batchId: number;
  facultyUserId?: number;
  timetableId?: number;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  subject?: string;
  topicCovered?: string;
  sessionNotes?: string;
  homeworkNotes?: string;
  status?: string;
}

// ── Attendance ────────────────────────────────────────────────────────────────

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HOLIDAY";

export interface StudentAttendanceResponse {
  id: number;
  classSessionId: number;
  sessionDate?: string;
  subject?: string;
  batchName?: string;
  studentId: number;
  studentName: string;
  studentNumber: string;
  status: AttendanceStatus;
  remarks?: string;
  markedByName?: string;
  markedAt?: string;
}

export interface AttendanceSummaryResponse {
  studentId: number;
  studentName: string;
  studentNumber: string;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  holiday: number;
  attendancePercent: number;
}

export interface AttendanceEntryRequest {
  studentId: number;
  status: AttendanceStatus;
  remarks?: string;
}

export interface MarkAttendanceRequest {
  entries: AttendanceEntryRequest[];
}

// ── Study Materials ───────────────────────────────────────────────────────────

export type MaterialType = "PDF" | "NOTES" | "PPT" | "ASSIGNMENT" | "LINK" | "VIDEO";

export interface StudyMaterialResponse {
  id: number;
  uuid: string;
  courseId?: number;
  courseName?: string;
  batchId?: number;
  batchName?: string;
  subject?: string;
  uploadedBy: number;
  uploaderName?: string;
  title: string;
  description?: string;
  materialType: MaterialType;
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  externalLink?: string;
  active: boolean;
  createdAt: string;
}

// ── Student Portal Dashboard ──────────────────────────────────────────────────

export interface StudentPortalDashboard {
  studentId: number;
  studentNumber: string;
  fullName: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  admissionId?: number;
  courseName?: string;
  batchName?: string;
  batchCode?: string;
  batchTiming?: string;
  batchMode?: string;
  facultyName?: string;
  attendanceSummary?: AttendanceSummaryResponse;
  todaySchedule: TimetableResponse[];
  portalActive: boolean;
}
