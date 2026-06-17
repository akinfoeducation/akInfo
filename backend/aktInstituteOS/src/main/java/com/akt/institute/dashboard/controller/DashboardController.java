package com.akt.institute.dashboard.controller;

import com.akt.institute.dashboard.dto.CallerDashboardResponse;
import com.akt.institute.dashboard.dto.CallerDetailResponse;
import com.akt.institute.dashboard.dto.CallerPerformanceResponse;
import com.akt.institute.dashboard.dto.CounsellorDashboardResponse;
import com.akt.institute.dashboard.dto.DashboardRecentResponse;
import com.akt.institute.dashboard.dto.DashboardSummaryResponse;
import com.akt.institute.dashboard.dto.FacultyDashboardResponse;
import com.akt.institute.dashboard.repository.DashboardJdbcDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardJdbcDao dao;

    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> summary(
        @AuthenticationPrincipal UserPrincipal p
    ) {
        return ResponseEntity.ok(ApiResponse.ok(dao.summary(p.getInstituteId())));
    }

    @GetMapping("/recent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DashboardRecentResponse.Response>> recent(
        @AuthenticationPrincipal UserPrincipal p
    ) {
        Long iid = p.getInstituteId();
        var response = new DashboardRecentResponse.Response(
            dao.recentAdmissions(iid),
            dao.recentPayments(iid),
            dao.recentEnquiries(iid)
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Faculty-scoped dashboard: shows only data relevant to the authenticated faculty's
     * assigned batches, students, and sessions.
     */
    @GetMapping("/caller")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    public ResponseEntity<ApiResponse<CallerDashboardResponse>> callerDashboard(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.ok(dao.callerSummary(p.getInstituteId(), p.getId(), from, to)));
    }

    /**
     * Admin Caller Performance Dashboard.
     * Returns per-caller stats, retry pool summary, recent activity feed, and branch transfer log.
     * Defaults to today if no date range provided.
     */
    @GetMapping("/caller-performance")
    @PreAuthorize("hasAuthority('LEAD_ASSIGN')")
    public ResponseEntity<ApiResponse<CallerPerformanceResponse>> callerPerformance(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        LocalDate dateFrom = from != null ? from : LocalDate.now();
        LocalDate dateTo   = to   != null ? to   : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(dao.callerPerformance(p.getInstituteId(), dateFrom, dateTo)));
    }

    /** Individual caller drill-down — admin only. */
    @GetMapping("/caller-performance/{callerId}")
    @PreAuthorize("hasAuthority('LEAD_ASSIGN')")
    public ResponseEntity<ApiResponse<CallerDetailResponse>> callerDetail(
        @AuthenticationPrincipal UserPrincipal p,
        @PathVariable Long callerId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        LocalDate dateFrom = from != null ? from : LocalDate.now();
        LocalDate dateTo   = to   != null ? to   : LocalDate.now();
        CallerDetailResponse detail = dao.callerDetail(p.getInstituteId(), callerId, dateFrom, dateTo);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    /**
     * Counsellor dashboard — scoped to the authenticated counsellor's own leads and admissions.
     * Admins can pass ?counsellorId=X to view any counsellor's dashboard.
     */
    @GetMapping("/counsellor")
    @PreAuthorize("hasAuthority('LEAD_VIEW')")
    public ResponseEntity<ApiResponse<CounsellorDashboardResponse>> counsellorDashboard(
        @AuthenticationPrincipal UserPrincipal p,
        @RequestParam(required = false) Long counsellorId
    ) {
        Long targetId = counsellorId != null ? counsellorId : p.getId();
        return ResponseEntity.ok(ApiResponse.ok(dao.counsellorSummary(p.getInstituteId(), targetId)));
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasAuthority('BATCH_FACULTY_VIEW')")
    public ResponseEntity<ApiResponse<FacultyDashboardResponse>> facultyDashboard(
        @AuthenticationPrincipal UserPrincipal p
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                dao.facultySummary(p.getInstituteId(), p.getId())));
    }
}
