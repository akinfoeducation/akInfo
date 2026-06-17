package com.akt.institute.attendance.repository;

import com.akt.institute.attendance.dto.AttendanceSummaryResponse;
import com.akt.institute.attendance.dto.StudentAttendanceResponse;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceDao {

    // Session roster with each student's current status
    List<StudentAttendanceResponse> findBySession(Long sessionId, Long instituteId);

    // Upsert attendance for a student in a session
    void upsert(Long sessionId, Long batchId, Long studentId, Long instituteId,
                String status, String remarks, Long markedBy);

    // Per-student history
    List<StudentAttendanceResponse> findByStudent(Long studentId, Long instituteId,
                                                  LocalDate from, LocalDate to);

    // Summary per student in a batch
    List<AttendanceSummaryResponse> summaryByBatch(Long batchId, Long instituteId);

    // Summary for a single student
    AttendanceSummaryResponse summaryForStudent(Long studentId, Long instituteId);
}
