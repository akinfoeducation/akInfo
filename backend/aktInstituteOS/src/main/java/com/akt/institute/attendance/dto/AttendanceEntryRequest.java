package com.akt.institute.attendance.dto;

import lombok.Data;

@Data
public class AttendanceEntryRequest {
    private Long   studentId;
    private String status;   // PRESENT | ABSENT | LATE | HOLIDAY
    private String remarks;
}
