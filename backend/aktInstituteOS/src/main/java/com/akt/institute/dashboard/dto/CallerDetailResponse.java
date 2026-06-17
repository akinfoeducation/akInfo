package com.akt.institute.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Full drill-down response for a single caller.
 * Used by the admin Caller Performance detail page.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CallerDetailResponse {

    // ── Caller identity ───────────────────────────────────────────────────────
    private Long   callerId;
    private String callerName;
    private String callerPhone;
    private String callerEmail;

    // ── Summary stats (same shape as CallerPerformanceRow) ────────────────────
    private CallerPerformanceRow stats;

    // ── Lead breakdown by status ──────────────────────────────────────────────
    private List<StatusCount> statusBreakdown;

    // ── Recent leads (last 30 touched by this caller in the period) ───────────
    private List<RecentLead> recentLeads;

    // ── Activity timeline (last 30 actions by this caller) ────────────────────
    private List<CallerPerformanceResponse.RecentCallerActivity> activities;

    // ── Branch transfers done by this caller ──────────────────────────────────
    private List<CallerPerformanceResponse.BranchTransferLog> branchTransfers;

    // ── Nested types ─────────────────────────────────────────────────────────

    @Data @Builder
    public static class StatusCount {
        private String status;
        private long   count;
    }

    @Data @Builder
    public static class RecentLead {
        private Long   leadId;
        private String leadName;
        private String phone;
        private String status;
        private String courseInterested;
        private String assignedAt;
        private String lastActivityAt;
    }
}
