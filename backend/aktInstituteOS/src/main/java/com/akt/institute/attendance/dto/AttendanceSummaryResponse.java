package com.akt.institute.attendance.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AttendanceSummaryResponse {
    private Long   studentId;
    private String studentName;
    private String studentNumber;
    private int    totalSessions;
    private int    present;
    private int    absent;
    private int    late;
    private int    holiday;
    private double attendancePercent;  // (present + late) / (total - holiday) * 100
}
