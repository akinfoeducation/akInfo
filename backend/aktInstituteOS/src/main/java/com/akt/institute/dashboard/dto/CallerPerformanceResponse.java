package com.akt.institute.dashboard.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Full admin Caller Performance dashboard response.
 */
@Data
@Builder
public class CallerPerformanceResponse {

    // ── Caller table ─────────────────────────────────────────────────────────
    private List<CallerPerformanceRow> callers;

    // ── Retry pool summary ────────────────────────────────────────────────────
    private long retryPoolTotal;    // current NOT_CONNECTED leads eligible (>30 min)
    private long retryPickedToday;  // POOL_CLAIM transfers today
    private long retryPending;      // NOT_CONNECTED leads NOT YET eligible (<30 min)

    // ── Recent activity feed (last 20 actions across all callers) ─────────────
    private List<RecentCallerActivity> recentActivity;

    // ── Branch transfer log (last 20 branch transfers) ────────────────────────
    private List<BranchTransferLog> branchTransfers;

    // ── Nested types ─────────────────────────────────────────────────────────

    @Data @Builder
    public static class RecentCallerActivity {
        private String callerName;
        private String leadName;
        private String actionType;
        private String description;
        private String createdAt;    // ISO string
    }

    @Data @Builder
    public static class BranchTransferLog {
        private String  leadName;
        private String  callerName;
        private String  branchName;
        private String  notes;
        private String  transferredAt;  // ISO string
    }
}
