package com.akt.institute.attendance.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class StudentAttendanceResponse {
    private Long      id;
    private Long      classSessionId;
    private LocalDate sessionDate;
    private String    subject;
    private String    batchName;
    private Long      studentId;
    private String    studentName;
    private String    studentNumber;
    private String    status;
    private String    remarks;
    private String    markedByName;
    private Instant   markedAt;
}
