package com.akt.institute.portal.dto;

import com.akt.institute.attendance.dto.AttendanceSummaryResponse;
import com.akt.institute.timetable.dto.TimetableResponse;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StudentPortalDashboard {
    private Long    studentId;
    private String  studentNumber;
    private String  fullName;
    private String  avatarUrl;
    private String  email;
    private String  phone;

    // Current enrollment
    private Long    admissionId;
    private String  courseName;
    private String  batchName;
    private String  batchCode;
    private String  batchTiming;
    private String  batchMode;
    private String  facultyName;

    // Attendance snapshot
    private AttendanceSummaryResponse attendanceSummary;

    // Today's schedule
    private List<TimetableResponse> todaySchedule;

    // Portal activation status
    private boolean portalActive;
}
