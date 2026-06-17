package com.akt.institute.portal.controller;

import com.akt.institute.attendance.dto.AttendanceSummaryResponse;
import com.akt.institute.attendance.dto.StudentAttendanceResponse;
import com.akt.institute.material.dto.StudyMaterialResponse;
import com.akt.institute.portal.dto.PortalActivateRequest;
import com.akt.institute.portal.dto.StudentPortalDashboard;
import com.akt.institute.portal.service.StudentPortalService;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import com.akt.institute.timetable.dto.TimetableResponse;
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
@RequestMapping("/api/v1/portal")
@RequiredArgsConstructor
@Tag(name = "Student Portal", description = "Student self-service portal APIs")
@SecurityRequirement(name = "bearerAuth")
public class StudentPortalController {

    private final StudentPortalService portalService;

    // ── Admin: activate student portal ────────────────────────────────────────

    @PostMapping("/students/{studentId}/activate")
    @PreAuthorize("hasAuthority('USER_CREATE')")
    @Operation(summary = "Admin: activate portal access for a student")
    public ResponseEntity<ApiResponse<Void>> activate(
            @PathVariable Long studentId,
            @Valid @RequestBody PortalActivateRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        portalService.activatePortal(studentId, p.getInstituteId(), p.getId(), req);
        return ResponseEntity.ok(ApiResponse.message("Student portal activated successfully"));
    }

    @GetMapping("/students/{studentId}/status")
    @PreAuthorize("hasAuthority('STUDENT_VIEW')")
    @Operation(summary = "Admin: check if student portal is activated")
    public ResponseEntity<ApiResponse<Boolean>> status(
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                portalService.isPortalActive(studentId, p.getInstituteId())));
    }

    // ── Student: self-service APIs ────────────────────────────────────────────

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('STUDENT_PORTAL')")
    @Operation(summary = "Student: get dashboard (enrollment, attendance, today's schedule)")
    public ResponseEntity<ApiResponse<StudentPortalDashboard>> myDashboard(
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                portalService.getDashboard(p.getId(), p.getInstituteId())));
    }

    @GetMapping("/me/attendance")
    @PreAuthorize("hasAuthority('STUDENT_PORTAL')")
    @Operation(summary = "Student: view my attendance history")
    public ResponseEntity<ApiResponse<List<StudentAttendanceResponse>>> myAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                portalService.getMyAttendance(p.getId(), p.getInstituteId(), from, to)));
    }

    @GetMapping("/me/attendance/summary")
    @PreAuthorize("hasAuthority('STUDENT_PORTAL')")
    @Operation(summary = "Student: overall attendance percentage")
    public ResponseEntity<ApiResponse<AttendanceSummaryResponse>> myAttendanceSummary(
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                portalService.getMyAttendanceSummary(p.getId(), p.getInstituteId())));
    }

    @GetMapping("/me/materials")
    @PreAuthorize("hasAuthority('STUDENT_PORTAL')")
    @Operation(summary = "Student: view study materials for my batch")
    public ResponseEntity<ApiResponse<List<StudyMaterialResponse>>> myMaterials(
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                portalService.getMyMaterials(p.getId(), p.getInstituteId())));
    }

    @GetMapping("/me/schedule")
    @PreAuthorize("hasAuthority('STUDENT_PORTAL')")
    @Operation(summary = "Student: view my batch timetable")
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> mySchedule(
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.ok(
                portalService.getMySchedule(p.getId(), p.getInstituteId())));
    }
}
