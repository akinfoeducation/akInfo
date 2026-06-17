package com.akt.institute.dashboard.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class FacultyDashboardResponse {

    // ── Batch scope ───────────────────────────────────────────────────────────
    private long assignedBatches;
    private long activeBatches;
    private long plannedBatches;

    // ── Student scope ─────────────────────────────────────────────────────────
    private long totalAssignedStudents;   // all statuses
    private long activeStudents;          // status = ACTIVE / ENROLLED
    private long overdueStudents;         // students with fees_due > 0

    // ── Fee summary (read-only view) ─────────────────────────────────────────
    private BigDecimal totalPendingFees;  // sum of (fees_agreed - fees_paid) for assigned students
    private BigDecimal totalFeesCollected;

    // ── Attendance ────────────────────────────────────────────────────────────
    private double avgAttendancePercent;
    private long   totalSessionsConducted;
    private long   sessionsWithAttendancePending;

    // ── Today / this week (secondary) ────────────────────────────────────────
    private long todaySessions;
    private long thisWeekSessions;

    // ── Recent sessions ───────────────────────────────────────────────────────
    private List<RecentSession> recentSessions;

    @Data
    @Builder
    public static class RecentSession {
        private long    id;
        private String  batchName;
        private String  subject;
        private String  sessionDate;
        private String  status;
        private boolean attendanceMarked;
        private int     presentCount;
        private int     totalStudents;
    }
}
