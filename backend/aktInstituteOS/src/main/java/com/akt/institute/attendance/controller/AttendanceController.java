package com.akt.institute.attendance.controller;

import com.akt.institute.attendance.dto.*;
import com.akt.institute.attendance.service.AttendanceService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@Tag(name = "Attendance", description = "Student attendance marking and reporting")
@SecurityRequirement(name = "bearerAuth")
public class AttendanceController {

    private final AttendanceService attendanceService;

    // ── Session roster ────────────────────────────────────────────────────────

    @GetMapping("/sessions/{sessionId}")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW')")
    @Operation(summary = "Get student roster for a session with attendance status. Faculty scoped to own sessions.")
    public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> sessionRoster(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal UserPrincipal p) {
        // Faculty can only view roster for their own sessions
        Long requiredFacultyId = p.isFacultyOnly() ? p.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                attendanceService.getSessionRoster(sessionId, p.getInstituteId(), requiredFacultyId)));
    }

    // ── Mark attendance ───────────────────────────────────────────────────────

    @PostMapping("/sessions/{sessionId}/mark")
    @PreAuthorize("hasAuthority('ATTENDANCE_MARK')")
    @Operation(summary = "Bulk mark attendance. Faculty can only mark attendance for sessions assigned to them.")
    public ResponseEntity<ApiResponse<Void>> mark(
            @PathVariable Long sessionId,
            @Valid @RequestBody MarkAttendanceRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        // For faculty, enforce that the session belongs to them
        Long requiredFacultyId = p.isFacultyOnly() ? p.getId() : null;
        attendanceService.markAttendance(sessionId, p.getInstituteId(), p.getId(), req, requiredFacultyId);
        return ResponseEntity.ok(ApiResponse.message("Attendance marked successfully"));
    }

    // ── Student history ───────────────────────────────────────────────────────

    @GetMapping("/students/{studentId}")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW')")
    @Operation(summary = "Get attendance history for a student")
    public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> studentHistory(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                attendanceService.getStudentHistory(studentId, p.getInstituteId(), from, to)));
    }

    @GetMapping("/students/{studentId}/summary")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW')")
    @Operation(summary = "Attendance percentage summary for a student")
    public ResponseEntity<ApiResponse<AttendanceSummaryResponse>> studentSummary(
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                attendanceService.getStudentSummary(studentId, p.getInstituteId())));
    }

    // ── Batch summary ─────────────────────────────────────────────────────────

    @GetMapping("/batches/{batchId}/summary")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW')")
    @Operation(summary = "Attendance summary for all students in a batch")
    public ResponseEntity<ApiResponse<List<AttendanceSummaryResponse>>> batchSummary(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                attendanceService.getBatchSummary(batchId, p.getInstituteId())));
    }
}
