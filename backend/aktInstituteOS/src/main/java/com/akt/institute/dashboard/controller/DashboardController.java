package com.akt.institute.dashboard.controller;

import com.akt.institute.dashboard.dto.DashboardRecentResponse;
import com.akt.institute.dashboard.dto.DashboardSummaryResponse;
import com.akt.institute.dashboard.repository.DashboardJdbcDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardJdbcDao dao;

    /**
     * Single fast call for all summary card values.
     * All counts/sums use indexed columns only — no heavy joins.
     */
    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> summary(
        @AuthenticationPrincipal UserPrincipal p
    ) {
        return ResponseEntity.ok(ApiResponse.ok(dao.summary(p.getInstituteId())));
    }

    /**
     * Recent activity feed — lazy loaded after initial render.
     * Returns max 5 rows each for admissions, payments, enquiries.
     */
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
}
