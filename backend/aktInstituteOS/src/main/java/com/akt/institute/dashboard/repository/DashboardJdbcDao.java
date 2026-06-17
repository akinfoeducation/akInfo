package com.akt.institute.dashboard.repository;

import com.akt.institute.dashboard.dto.CallerDetailResponse;
import com.akt.institute.dashboard.dto.CallerDetailResponse.*;
import com.akt.institute.dashboard.dto.CallerPerformanceResponse;
import com.akt.institute.dashboard.dto.CallerPerformanceResponse.*;
import com.akt.institute.dashboard.dto.CallerPerformanceRow;
import com.akt.institute.dashboard.dto.CounsellorDashboardResponse;
import com.akt.institute.dashboard.dto.DashboardRecentResponse.*;
import com.akt.institute.dashboard.dto.DashboardSummaryResponse;
import com.akt.institute.dashboard.dto.FacultyDashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class DashboardJdbcDao {

    private final NamedParameterJdbcTemplate jdbc;

    // ── Summary (one call, pure aggregates) ──────────────────────────────────

    public DashboardSummaryResponse summary(Long instituteId) {
        LocalDate today = LocalDate.now();
        LocalDate som   = YearMonth.now().atDay(1);
        var p = new MapSqlParameterSource()
            .addValue("iid",   instituteId)
            .addValue("today", Date.valueOf(today))
            .addValue("som",   Date.valueOf(som));

        long totalStudents = q("SELECT COUNT(1) FROM students WHERE institute_id=:iid AND deleted_at IS NULL", p);

        long todayAdmissions = q("SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)=:today", p);
        long monthAdmissions = q("SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:som AND DATE(created_at)<=:today", p);
        long totalAdmissions = q("SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL", p);

        long activeBatches = q("SELECT COUNT(1) FROM batches WHERE institute_id=:iid AND deleted_at IS NULL AND status='ACTIVE'", p);

        BigDecimal todayFees = bd("SELECT COALESCE(SUM(amount),0) FROM fee_payments WHERE institute_id=:iid AND deleted_at IS NULL AND payment_date=:today", p);
        long todayFeeCount   = q("SELECT COUNT(1) FROM fee_payments WHERE institute_id=:iid AND deleted_at IS NULL AND payment_date=:today", p);
        BigDecimal pending   = bd("SELECT COALESCE(SUM(fees_agreed-fees_paid),0) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND status NOT IN ('CANCELLED','COMPLETED') AND (fees_agreed-fees_paid)>0", p);
        long overdueCount    = q("SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND status NOT IN ('CANCELLED','COMPLETED') AND (fees_agreed-fees_paid)>0", p);

        long totalEnquiries  = q("SELECT COUNT(1) FROM leads WHERE institute_id=:iid AND deleted_at IS NULL", p);
        long monthEnquiries  = q("SELECT COUNT(1) FROM leads WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:som AND DATE(created_at)<=:today", p);
        long todayFollowUps  = q("SELECT COUNT(1) FROM leads WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(next_follow_up_at)=:today", p);

        return DashboardSummaryResponse.builder()
            .totalStudents(totalStudents)
            .todayAdmissions(todayAdmissions)
            .monthAdmissions(monthAdmissions)
            .totalAdmissions(totalAdmissions)
            .activeBatches(activeBatches)
            .todayFeeCollection(todayFees)
            .todayFeeCount(todayFeeCount)
            .pendingFees(pending)
            .overdueCount(overdueCount)
            .totalEnquiries(totalEnquiries)
            .monthEnquiries(monthEnquiries)
            .todayFollowUps(todayFollowUps)
            .build();
    }

    // ── Recent admissions (max 5) ─────────────────────────────────────────────

    public List<RecentAdmission> recentAdmissions(Long instituteId) {
        return jdbc.query("""
            SELECT id,
                   admission_number,
                   CONCAT(first_name, CASE WHEN last_name IS NOT NULL THEN ' '||last_name ELSE '' END) AS student_name,
                   phone, course_name, status, created_at
            FROM admissions
            WHERE institute_id=:iid AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 5
            """,
            new MapSqlParameterSource("iid", instituteId),
            (rs, rn) -> new RecentAdmission(
                rs.getLong("id"),
                rs.getString("admission_number"),
                rs.getString("student_name"),
                rs.getString("phone"),
                rs.getString("course_name"),
                rs.getString("status"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant().toString() : null
            ));
    }

    // ── Recent payments (max 5) ───────────────────────────────────────────────

    public List<RecentPayment> recentPayments(Long instituteId) {
        return jdbc.query("""
            SELECT fp.id, fp.receipt_number, fp.amount, fp.payment_mode, fp.payment_date,
                   a.course_name,
                   CONCAT(a.first_name, CASE WHEN a.last_name IS NOT NULL THEN ' '||a.last_name ELSE '' END) AS student_name
            FROM fee_payments fp
            JOIN admissions a ON a.id=fp.admission_id
            WHERE fp.institute_id=:iid AND fp.deleted_at IS NULL
            ORDER BY fp.created_at DESC
            LIMIT 5
            """,
            new MapSqlParameterSource("iid", instituteId),
            (rs, rn) -> new RecentPayment(
                rs.getLong("id"),
                rs.getString("receipt_number"),
                rs.getString("student_name"),
                rs.getBigDecimal("amount"),
                rs.getString("payment_mode"),
                rs.getString("course_name"),
                rs.getDate("payment_date") != null ? rs.getDate("payment_date").toString() : null
            ));
    }

    // ── Recent enquiries (max 5) ──────────────────────────────────────────────

    public List<RecentEnquiry> recentEnquiries(Long instituteId) {
        return jdbc.query("""
            SELECT id,
                   CONCAT(first_name, CASE WHEN last_name IS NOT NULL THEN ' '||last_name ELSE '' END) AS lead_name,
                   phone, source, course_interested, status, created_at
            FROM leads
            WHERE institute_id=:iid AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 5
            """,
            new MapSqlParameterSource("iid", instituteId),
            (rs, rn) -> new RecentEnquiry(
                rs.getLong("id"),
                rs.getString("lead_name"),
                rs.getString("phone"),
                rs.getString("source"),
                rs.getString("course_interested"),
                rs.getString("status"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant().toString() : null
            ));
    }

    // ── Faculty dashboard ─────────────────────────────────────────────────────

    public FacultyDashboardResponse facultySummary(Long instituteId, Long facultyUserId) {
        LocalDate today     = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        var p = new MapSqlParameterSource()
                .addValue("iid",       instituteId)
                .addValue("fid",       facultyUserId)
                .addValue("today",     Date.valueOf(today))
                .addValue("weekStart", Date.valueOf(weekStart));

        // ── Batch aggregates ──────────────────────────────────────────────────
        long assignedBatches = q(
                "SELECT COUNT(DISTINCT bf.batch_id) FROM batch_faculty bf"
                + " JOIN batches b ON b.id=bf.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND b.institute_id=:iid AND b.deleted_at IS NULL", p);

        long activeBatches = q(
                "SELECT COUNT(DISTINCT bf.batch_id) FROM batch_faculty bf"
                + " JOIN batches b ON b.id=bf.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND b.institute_id=:iid AND b.status='ACTIVE' AND b.deleted_at IS NULL", p);

        long plannedBatches = q(
                "SELECT COUNT(DISTINCT bf.batch_id) FROM batch_faculty bf"
                + " JOIN batches b ON b.id=bf.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND b.institute_id=:iid AND b.status='PLANNED' AND b.deleted_at IS NULL", p);

        // ── Student aggregates (via admissions → batch_faculty) ───────────────
        long totalStudents = q(
                "SELECT COUNT(DISTINCT a.id) FROM admissions a"
                + " JOIN batch_faculty bf ON bf.batch_id=a.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND a.institute_id=:iid AND a.deleted_at IS NULL"
                + "   AND a.status NOT IN ('CANCELLED')", p);

        long activeStudents = q(
                "SELECT COUNT(DISTINCT a.id) FROM admissions a"
                + " JOIN batch_faculty bf ON bf.batch_id=a.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND a.institute_id=:iid AND a.deleted_at IS NULL"
                + "   AND a.status IN ('ACTIVE','ENROLLED')", p);

        long overdueStudents = q(
                "SELECT COUNT(DISTINCT a.id) FROM admissions a"
                + " JOIN batch_faculty bf ON bf.batch_id=a.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND a.institute_id=:iid AND a.deleted_at IS NULL"
                + "   AND a.status NOT IN ('CANCELLED','COMPLETED')"
                + "   AND (a.fees_agreed - a.fees_paid) > 0", p);

        // ── Fee summary (read-only) ───────────────────────────────────────────
        BigDecimal pendingFees = bd(
                "SELECT COALESCE(SUM(a.fees_agreed - a.fees_paid), 0) FROM admissions a"
                + " JOIN batch_faculty bf ON bf.batch_id=a.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND a.institute_id=:iid AND a.deleted_at IS NULL"
                + "   AND a.status NOT IN ('CANCELLED','COMPLETED')"
                + "   AND (a.fees_agreed - a.fees_paid) > 0", p);

        BigDecimal feesCollected = bd(
                "SELECT COALESCE(SUM(a.fees_paid), 0) FROM admissions a"
                + " JOIN batch_faculty bf ON bf.batch_id=a.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND a.institute_id=:iid AND a.deleted_at IS NULL"
                + "   AND a.status NOT IN ('CANCELLED')", p);

        // ── Session aggregates ────────────────────────────────────────────────
        // Note: class_sessions has no deleted_at column — filter by status instead
        long totalSessions = q(
                "SELECT COUNT(1) FROM class_sessions"
                + " WHERE faculty_user_id=:fid AND institute_id=:iid"
                + "   AND status <> 'CANCELLED'", p);

        long pendingAttendance = q(
                "SELECT COUNT(1) FROM class_sessions"
                + " WHERE faculty_user_id=:fid AND institute_id=:iid"
                + "   AND session_date<=:today AND attendance_marked=false"
                + "   AND status <> 'CANCELLED'", p);

        long todaySessions = q(
                "SELECT COUNT(1) FROM class_sessions"
                + " WHERE faculty_user_id=:fid AND institute_id=:iid"
                + "   AND session_date=:today AND status <> 'CANCELLED'", p);

        long weekSessions = q(
                "SELECT COUNT(1) FROM class_sessions"
                + " WHERE faculty_user_id=:fid AND institute_id=:iid"
                + "   AND session_date>=:weekStart AND session_date<=:today"
                + "   AND status <> 'CANCELLED'", p);

        // ── Attendance percentage ─────────────────────────────────────────────
        // FK is class_session_id (not session_id); present_count/total computed from student_attendance
        BigDecimal avgAtt = jdbc.queryForObject(
                "SELECT COALESCE(AVG(att_pct), 0) FROM ("
                + "  SELECT CASE WHEN total > 0 THEN (present * 100.0 / total) ELSE 0 END AS att_pct"
                + "  FROM (SELECT COUNT(1) AS total,"
                + "              SUM(CASE WHEN sa.status='PRESENT' THEN 1 ELSE 0 END) AS present"
                + "        FROM student_attendance sa"
                + "        JOIN class_sessions cs ON cs.id = sa.class_session_id"
                + "        WHERE cs.faculty_user_id=:fid AND cs.institute_id=:iid) s"
                + ") x", p, BigDecimal.class);

        // ── Recent sessions ───────────────────────────────────────────────────
        // present_count and total_students are computed — they are not stored columns
        List<FacultyDashboardResponse.RecentSession> recentSessions = jdbc.query(
                "SELECT cs.id, b.name AS batch_name, cs.subject, cs.session_date::TEXT, cs.status,"
                + "  cs.attendance_marked,"
                + "  (SELECT COUNT(*) FROM student_attendance sa WHERE sa.class_session_id=cs.id AND sa.status='PRESENT') AS present_count,"
                + "  (SELECT COUNT(*) FROM student_attendance sa WHERE sa.class_session_id=cs.id) AS total_students"
                + " FROM class_sessions cs LEFT JOIN batches b ON b.id = cs.batch_id"
                + " WHERE cs.faculty_user_id=:fid AND cs.institute_id=:iid"
                + "   AND cs.status <> 'CANCELLED'"
                + " ORDER BY cs.session_date DESC LIMIT 8",
                p,
                (rs, rn) -> FacultyDashboardResponse.RecentSession.builder()
                        .id(rs.getLong("id"))
                        .batchName(rs.getString("batch_name"))
                        .subject(rs.getString("subject"))
                        .sessionDate(rs.getString("session_date"))
                        .status(rs.getString("status"))
                        .attendanceMarked(rs.getBoolean("attendance_marked"))
                        .presentCount(rs.getInt("present_count"))
                        .totalStudents(rs.getInt("total_students"))
                        .build());

        return FacultyDashboardResponse.builder()
                .assignedBatches(assignedBatches)
                .activeBatches(activeBatches)
                .plannedBatches(plannedBatches)
                .totalAssignedStudents(totalStudents)
                .activeStudents(activeStudents)
                .overdueStudents(overdueStudents)
                .totalPendingFees(pendingFees)
                .totalFeesCollected(feesCollected)
                .avgAttendancePercent(avgAtt == null ? 0.0 : avgAtt.doubleValue())
                .totalSessionsConducted(totalSessions)
                .sessionsWithAttendancePending(pendingAttendance)
                .todaySessions(todaySessions)
                .thisWeekSessions(weekSessions)
                .recentSessions(recentSessions)
                .build();
    }

    // ── Caller dashboard ─────────────────────────────────────────────────────

    public com.akt.institute.dashboard.dto.CallerDashboardResponse callerSummary(
            Long instituteId, Long callerId, LocalDate from, LocalDate to) {
        LocalDate today    = LocalDate.now();
        LocalDate dateFrom = from != null ? from : LocalDate.of(2000, 1, 1);
        LocalDate dateTo   = to   != null ? to   : today;

        var p = new MapSqlParameterSource()
            .addValue("iid",      instituteId)
            .addValue("callerId", callerId)
            .addValue("today",    Date.valueOf(today))
            .addValue("from",     Date.valueOf(dateFrom))
            .addValue("to",       Date.valueOf(dateTo));

        // ── Single query for all lead counts (8 queries → 1) ─────────────────
        String leadSql = """
                SELECT
                    COUNT(*)                                                        AS assigned_leads,
                    COUNT(*) FILTER (WHERE status = 'INTERESTED')                  AS interested_leads,
                    COUNT(*) FILTER (WHERE status = 'CALLBACK')                    AS pending_callbacks,
                    COUNT(*) FILTER (WHERE status = 'ADMISSION_INTERESTED')        AS admission_interested,
                    COUNT(*) FILTER (WHERE status = 'PAYMENT_PENDING')             AS payment_pending,
                    COUNT(*) FILTER (WHERE status = 'BOOKING_CONFIRMED')           AS booking_confirmed
                FROM leads
                WHERE institute_id    = :iid
                  AND assigned_to_id  = :callerId
                  AND deleted_at      IS NULL
                  AND DATE(assigned_at) BETWEEN :from AND :to
                """;

        long assignedLeads = 0, interestedLeads = 0, pendingCallbacks = 0,
             admissionInterested = 0, paymentPending = 0, bookingConfirmed = 0;

        var leadRows = jdbc.queryForList(leadSql, p);
        if (!leadRows.isEmpty()) {
            var row = leadRows.get(0);
            assignedLeads       = toLong(row.get("assigned_leads"));
            interestedLeads     = toLong(row.get("interested_leads"));
            pendingCallbacks    = toLong(row.get("pending_callbacks"));
            admissionInterested = toLong(row.get("admission_interested"));
            paymentPending      = toLong(row.get("payment_pending"));
            bookingConfirmed    = toLong(row.get("booking_confirmed"));
        }

        // ── Single query for follow-up counts ────────────────────────────────
        String fuSql = """
                SELECT
                    COUNT(*) FILTER (WHERE DATE(scheduled_at) = :today)              AS today_followups,
                    COUNT(*) FILTER (WHERE DATE(scheduled_at) < :today
                                       AND DATE(scheduled_at) >= :from)              AS overdue_followups
                FROM follow_ups
                WHERE institute_id = :iid
                  AND created_by   = :callerId
                  AND is_done      = FALSE
                """;

        long todayFollowUps = 0, overdueFollowUps = 0;
        var fuRows = jdbc.queryForList(fuSql, p);
        if (!fuRows.isEmpty()) {
            var row = fuRows.get(0);
            todayFollowUps   = toLong(row.get("today_followups"));
            overdueFollowUps = toLong(row.get("overdue_followups"));
        }

        return com.akt.institute.dashboard.dto.CallerDashboardResponse.builder()
            .assignedLeads(assignedLeads)
            .interestedLeads(interestedLeads)
            .pendingCallbacks(pendingCallbacks)
            .bookingConfirmed(bookingConfirmed)
            .todayFollowUps(todayFollowUps)
            .overdueFollowUps(overdueFollowUps)
            .admissionInterested(admissionInterested)
            .paymentPending(paymentPending)
            .build();
    }

    private static long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Number n) return n.longValue();
        return 0L;
    }

    // ── Admin: Caller Performance Dashboard ──────────────────────────────────

    public CallerPerformanceResponse callerPerformance(Long instituteId, LocalDate from, LocalDate to) {
        var p = new MapSqlParameterSource()
            .addValue("iid",   instituteId)
            .addValue("from",  Date.valueOf(from))
            .addValue("to",    Date.valueOf(to))
            .addValue("today", Date.valueOf(LocalDate.now()));

        // ── 1. Per-caller lead stats (single query) ───────────────────────────
        // Caller = any user who has LEAD_VIEW permission via role
        // We join users → user_roles → roles → role_permissions → permissions
        // and filter by permission name = 'LEAD_VIEW' but NOT LEAD_ASSIGN (that's admin)
        String callerStatsSql = """
            SELECT
                u.id                                                                      AS caller_id,
                CONCAT(u.first_name, COALESCE(' ' || u.last_name, ''))                  AS caller_name,
                u.phone                                                                   AS caller_phone,
                COUNT(l.id)                                                               AS leads_assigned,
                COUNT(l.id) FILTER (WHERE l.status <> 'ASSIGNED' AND l.status <> 'NEW_LEAD') AS calls_attempted,
                COUNT(l.id) FILTER (WHERE l.status IN (
                    'CONTACTED','INTERESTED','FOLLOW_UP','CALLBACK','VISIT_PLANNED',
                    'ADMISSION_INTERESTED','PAYMENT_PENDING','PAYMENT_VERIFIED','BOOKING_CONFIRMED'
                ))                                                                         AS connected,
                COUNT(l.id) FILTER (WHERE l.status = 'NOT_CONNECTED')                    AS not_connected,
                COUNT(l.id) FILTER (WHERE l.status = 'INTERESTED')                       AS interested,
                COUNT(l.id) FILTER (WHERE l.status IN ('FOLLOW_UP','CALLBACK'))          AS follow_ups,
                COUNT(l.id) FILTER (WHERE l.status = 'VISIT_PLANNED')                    AS visit_planned,
                COUNT(l.id) FILTER (WHERE l.status = 'BOOKING_CONFIRMED')                AS admissions_converted,
                (SELECT MAX(la.created_at)
                 FROM   lead_activities la
                 WHERE  la.institute_id = :iid
                   AND  la.performed_by = u.id
                   AND  DATE(la.created_at) BETWEEN :from AND :to)                        AS last_activity_at,
                (SELECT COUNT(1)
                 FROM   lead_transfers lt2
                 WHERE  lt2.institute_id = :iid
                   AND  lt2.transfer_type = 'BRANCH_TRANSFER'
                   AND  lt2.transferred_by = u.id
                   AND  DATE(lt2.transferred_at) BETWEEN :from AND :to)                  AS branch_transfers
            FROM users u
            LEFT JOIN leads l
                ON l.assigned_to_id = u.id
               AND l.institute_id   = :iid
               AND l.deleted_at     IS NULL
               AND DATE(l.assigned_at) BETWEEN :from AND :to
            WHERE u.institute_id = :iid
              AND u.deleted_at IS NULL
              AND u.is_active = TRUE
              AND EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN role_permissions rp ON rp.role_id = ur.role_id
                  JOIN permissions pm ON pm.id = rp.permission_id
                  WHERE ur.user_id = u.id AND pm.code = 'LEAD_VIEW'
              )
              AND NOT EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN role_permissions rp ON rp.role_id = ur.role_id
                  JOIN permissions pm ON pm.id = rp.permission_id
                  WHERE ur.user_id = u.id AND pm.code = 'LEAD_ASSIGN'
              )
            GROUP BY u.id, u.first_name, u.last_name, u.phone
            ORDER BY leads_assigned DESC, caller_name ASC
            """;

        List<CallerPerformanceRow> callers = jdbc.query(callerStatsSql, p, (rs, rn) -> {
            long callsAttempted = rs.getLong("calls_attempted");
            long connected      = rs.getLong("connected");
            long interested     = rs.getLong("interested");
            long assigned       = rs.getLong("leads_assigned");
            long admitted       = rs.getLong("admissions_converted");

            double connRate  = callsAttempted > 0 ? round1(connected  * 100.0 / callsAttempted) : 0.0;
            double intRate   = connected      > 0 ? round1(interested * 100.0 / connected)       : 0.0;
            double admRate   = assigned       > 0 ? round1(admitted   * 100.0 / assigned)         : 0.0;

            var ts = rs.getTimestamp("last_activity_at");

            return CallerPerformanceRow.builder()
                .callerId(rs.getLong("caller_id"))
                .callerName(rs.getString("caller_name"))
                .callerPhone(rs.getString("caller_phone"))
                .leadsAssigned(assigned)
                .callsAttempted(callsAttempted)
                .connected(connected)
                .notConnected(rs.getLong("not_connected"))
                .interested(interested)
                .followUps(rs.getLong("follow_ups"))
                .visitPlanned(rs.getLong("visit_planned"))
                .admissionsConverted(admitted)
                .branchTransfers(rs.getLong("branch_transfers"))
                .connectionRate(connRate)
                .interestedRate(intRate)
                .admissionConversionRate(admRate)
                .lastActivityAt(ts != null ? ts.toInstant() : null)
                .build();
        });

        // ── 2. Retry pool summary ─────────────────────────────────────────────
        long retryTotal = q("""
            SELECT COUNT(1) FROM leads
            WHERE institute_id = :iid AND deleted_at IS NULL
              AND status = 'NOT_CONNECTED'
              AND not_connected_at IS NOT NULL
              AND not_connected_at < NOW() - (30 * INTERVAL '1 minute')
            """, p);

        long retryPending = q("""
            SELECT COUNT(1) FROM leads
            WHERE institute_id = :iid AND deleted_at IS NULL
              AND status = 'NOT_CONNECTED'
              AND not_connected_at IS NOT NULL
              AND not_connected_at >= NOW() - (30 * INTERVAL '1 minute')
            """, p);

        long retryPickedToday = q("""
            SELECT COUNT(1) FROM lead_transfers
            WHERE institute_id = :iid
              AND transfer_type = 'POOL_CLAIM'
              AND DATE(transferred_at) = :today
            """, p);

        // ── 3. Recent activity feed (last 20) ─────────────────────────────────
        List<RecentCallerActivity> recentActivity = jdbc.query("""
            SELECT
                la.action_type,
                la.description,
                la.created_at,
                CONCAT(u.first_name, COALESCE(' ' || u.last_name, '')) AS caller_name,
                CONCAT(l.first_name, COALESCE(' ' || l.last_name, '')) AS lead_name
            FROM lead_activities la
            LEFT JOIN users u ON u.id = la.performed_by
            LEFT JOIN leads l ON l.id = la.lead_id
            WHERE la.institute_id = :iid
              AND DATE(la.created_at) BETWEEN :from AND :to
            ORDER BY la.created_at DESC
            LIMIT 20
            """, p, (rs, rn) -> RecentCallerActivity.builder()
                .actionType(rs.getString("action_type"))
                .description(rs.getString("description"))
                .callerName(rs.getString("caller_name"))
                .leadName(rs.getString("lead_name"))
                .createdAt(rs.getTimestamp("created_at") != null
                    ? rs.getTimestamp("created_at").toInstant().toString() : null)
                .build());

        // ── 4. Branch transfer log (last 20) ──────────────────────────────────
        List<BranchTransferLog> branchTransfers = jdbc.query("""
            SELECT
                lt.notes,
                lt.transferred_at,
                CONCAT(l.first_name, COALESCE(' ' || l.last_name, '')) AS lead_name,
                CONCAT(u.first_name, COALESCE(' ' || u.last_name, '')) AS caller_name,
                b.name                                                   AS branch_name
            FROM lead_transfers lt
            LEFT JOIN leads    l ON l.id = lt.lead_id
            LEFT JOIN users    u ON u.id = lt.transferred_by
            LEFT JOIN branches b ON b.id = lt.to_branch_id
            WHERE lt.institute_id  = :iid
              AND lt.transfer_type = 'BRANCH_TRANSFER'
              AND DATE(lt.transferred_at) BETWEEN :from AND :to
            ORDER BY lt.transferred_at DESC
            LIMIT 20
            """, p, (rs, rn) -> BranchTransferLog.builder()
                .leadName(rs.getString("lead_name"))
                .callerName(rs.getString("caller_name"))
                .branchName(rs.getString("branch_name"))
                .notes(rs.getString("notes"))
                .transferredAt(rs.getTimestamp("transferred_at") != null
                    ? rs.getTimestamp("transferred_at").toInstant().toString() : null)
                .build());

        return CallerPerformanceResponse.builder()
            .callers(callers)
            .retryPoolTotal(retryTotal)
            .retryPickedToday(retryPickedToday)
            .retryPending(retryPending)
            .recentActivity(recentActivity)
            .branchTransfers(branchTransfers)
            .build();
    }

    // ── Admin: Single Caller Detail ───────────────────────────────────────────

    public CallerDetailResponse callerDetail(Long instituteId, Long callerId,
                                             LocalDate from, LocalDate to) {
        var p = new MapSqlParameterSource()
            .addValue("iid",      instituteId)
            .addValue("callerId", callerId)
            .addValue("from",     Date.valueOf(from))
            .addValue("to",       Date.valueOf(to));

        // ── Caller identity ───────────────────────────────────────────────────
        var identity = jdbc.queryForList("""
            SELECT id,
                   CONCAT(first_name, COALESCE(' ' || last_name, '')) AS name,
                   phone, email
            FROM users WHERE id = :callerId AND institute_id = :iid
            """, p);
        if (identity.isEmpty()) return null;
        var id = identity.get(0);

        // ── Reuse callerPerformance scoped to one caller ───────────────────────
        // Build a single stats row using the same aggregate query
        String statsSql = """
            SELECT
                COUNT(l.id)                                                                AS leads_assigned,
                COUNT(l.id) FILTER (WHERE l.status <> 'ASSIGNED' AND l.status <> 'NEW_LEAD') AS calls_attempted,
                COUNT(l.id) FILTER (WHERE l.status IN (
                    'CONTACTED','INTERESTED','FOLLOW_UP','CALLBACK','VISIT_PLANNED',
                    'ADMISSION_INTERESTED','PAYMENT_PENDING','PAYMENT_VERIFIED','BOOKING_CONFIRMED'
                ))                                                                          AS connected,
                COUNT(l.id) FILTER (WHERE l.status = 'NOT_CONNECTED')                     AS not_connected,
                COUNT(l.id) FILTER (WHERE l.status = 'INTERESTED')                        AS interested,
                COUNT(l.id) FILTER (WHERE l.status IN ('FOLLOW_UP','CALLBACK'))           AS follow_ups,
                COUNT(l.id) FILTER (WHERE l.status = 'VISIT_PLANNED')                     AS visit_planned,
                COUNT(l.id) FILTER (WHERE l.status = 'BOOKING_CONFIRMED')                 AS admissions_converted,
                (SELECT MAX(la.created_at) FROM lead_activities la
                 WHERE la.institute_id = :iid AND la.performed_by = :callerId
                   AND DATE(la.created_at) BETWEEN :from AND :to)                          AS last_activity_at,
                (SELECT COUNT(1) FROM lead_transfers lt
                 WHERE lt.institute_id = :iid AND lt.transfer_type = 'BRANCH_TRANSFER'
                   AND lt.transferred_by = :callerId
                   AND DATE(lt.transferred_at) BETWEEN :from AND :to)                      AS branch_transfers
            FROM leads l
            WHERE l.assigned_to_id = :callerId
              AND l.institute_id   = :iid
              AND l.deleted_at     IS NULL
              AND DATE(l.assigned_at) BETWEEN :from AND :to
            """;

        CallerPerformanceRow stats = null;
        var statRows = jdbc.queryForList(statsSql, p);
        if (!statRows.isEmpty()) {
            var r = statRows.get(0);
            long assigned  = toLong(r.get("leads_assigned"));
            long attempted = toLong(r.get("calls_attempted"));
            long connected = toLong(r.get("connected"));
            long interested= toLong(r.get("interested"));
            long admitted  = toLong(r.get("admissions_converted"));
            var ts = r.get("last_activity_at");

            stats = CallerPerformanceRow.builder()
                .callerId(callerId)
                .callerName((String) id.get("name"))
                .callerPhone((String) id.get("phone"))
                .leadsAssigned(assigned)
                .callsAttempted(attempted)
                .connected(connected)
                .notConnected(toLong(r.get("not_connected")))
                .interested(interested)
                .followUps(toLong(r.get("follow_ups")))
                .visitPlanned(toLong(r.get("visit_planned")))
                .admissionsConverted(admitted)
                .branchTransfers(toLong(r.get("branch_transfers")))
                .connectionRate(attempted > 0 ? round1(connected  * 100.0 / attempted) : 0)
                .interestedRate(connected  > 0 ? round1(interested * 100.0 / connected) : 0)
                .admissionConversionRate(assigned > 0 ? round1(admitted * 100.0 / assigned) : 0)
                .lastActivityAt(ts instanceof java.sql.Timestamp tsVal ? tsVal.toInstant() : null)
                .build();
        }

        // ── Status breakdown ──────────────────────────────────────────────────
        List<StatusCount> breakdown = jdbc.query("""
            SELECT status, COUNT(1) AS cnt
            FROM   leads
            WHERE  assigned_to_id = :callerId
              AND  institute_id   = :iid
              AND  deleted_at     IS NULL
              AND  DATE(assigned_at) BETWEEN :from AND :to
            GROUP  BY status
            ORDER  BY cnt DESC
            """, p, (rs, rn) -> StatusCount.builder()
                .status(rs.getString("status"))
                .count(rs.getLong("cnt"))
                .build());

        // ── Recent leads (last 30) ────────────────────────────────────────────
        List<RecentLead> recentLeads = jdbc.query("""
            SELECT
                l.id,
                CONCAT(l.first_name, COALESCE(' ' || l.last_name, '')) AS lead_name,
                l.phone,
                l.status,
                l.course_interested,
                l.assigned_at::TEXT,
                (SELECT MAX(la.created_at)::TEXT
                 FROM   lead_activities la
                 WHERE  la.lead_id = l.id
                   AND  la.performed_by = :callerId) AS last_activity_at
            FROM   leads l
            WHERE  l.assigned_to_id = :callerId
              AND  l.institute_id   = :iid
              AND  l.deleted_at     IS NULL
              AND  DATE(l.assigned_at) BETWEEN :from AND :to
            ORDER  BY l.updated_at DESC
            LIMIT  30
            """, p, (rs, rn) -> RecentLead.builder()
                .leadId(rs.getLong("id"))
                .leadName(rs.getString("lead_name"))
                .phone(rs.getString("phone"))
                .status(rs.getString("status"))
                .courseInterested(rs.getString("course_interested"))
                .assignedAt(rs.getString("assigned_at"))
                .lastActivityAt(rs.getString("last_activity_at"))
                .build());

        // ── Activity timeline (last 30 for this caller) ───────────────────────
        List<RecentCallerActivity> activities = jdbc.query("""
            SELECT
                la.action_type,
                la.description,
                la.created_at,
                CONCAT(l.first_name, COALESCE(' ' || l.last_name, '')) AS lead_name
            FROM   lead_activities la
            LEFT   JOIN leads l ON l.id = la.lead_id
            WHERE  la.institute_id = :iid
              AND  la.performed_by = :callerId
              AND  DATE(la.created_at) BETWEEN :from AND :to
            ORDER  BY la.created_at DESC
            LIMIT  30
            """, p, (rs, rn) -> RecentCallerActivity.builder()
                .actionType(rs.getString("action_type"))
                .description(rs.getString("description"))
                .leadName(rs.getString("lead_name"))
                .createdAt(rs.getTimestamp("created_at") != null
                    ? rs.getTimestamp("created_at").toInstant().toString() : null)
                .build());

        // ── Branch transfers by this caller ───────────────────────────────────
        List<BranchTransferLog> branchTransfers = jdbc.query("""
            SELECT
                lt.notes,
                lt.transferred_at,
                CONCAT(l.first_name, COALESCE(' ' || l.last_name, '')) AS lead_name,
                b.name AS branch_name
            FROM   lead_transfers lt
            LEFT   JOIN leads    l ON l.id = lt.lead_id
            LEFT   JOIN branches b ON b.id = lt.to_branch_id
            WHERE  lt.institute_id  = :iid
              AND  lt.transferred_by = :callerId
              AND  lt.transfer_type  = 'BRANCH_TRANSFER'
              AND  DATE(lt.transferred_at) BETWEEN :from AND :to
            ORDER  BY lt.transferred_at DESC
            LIMIT  20
            """, p, (rs, rn) -> BranchTransferLog.builder()
                .leadName(rs.getString("lead_name"))
                .branchName(rs.getString("branch_name"))
                .notes(rs.getString("notes"))
                .transferredAt(rs.getTimestamp("transferred_at") != null
                    ? rs.getTimestamp("transferred_at").toInstant().toString() : null)
                .build());

        return CallerDetailResponse.builder()
            .callerId(callerId)
            .callerName((String) id.get("name"))
            .callerPhone((String) id.get("phone"))
            .callerEmail((String) id.get("email"))
            .stats(stats)
            .statusBreakdown(breakdown)
            .recentLeads(recentLeads)
            .activities(activities)
            .branchTransfers(branchTransfers)
            .build();
    }

    // ── Counsellor dashboard ──────────────────────────────────────────────────

    public CounsellorDashboardResponse counsellorSummary(Long instituteId, Long counsellorId) {
        LocalDate today = LocalDate.now();
        LocalDate som   = YearMonth.now().atDay(1);

        var p = new MapSqlParameterSource()
            .addValue("iid",          instituteId)
            .addValue("counsellorId", counsellorId)
            .addValue("today",        Date.valueOf(today))
            .addValue("som",          Date.valueOf(som));

        // ── 1. Lead pipeline — all statuses in one query ──────────────────────
        // "Active" = counsellor owns it and it is not ADMISSION_DONE or CLOSED
        String leadSql = """
            SELECT
                COUNT(*) FILTER (WHERE status NOT IN ('ADMISSION_DONE','CLOSED'))
                                                                    AS my_active,
                COUNT(*) FILTER (WHERE status IN ('VISIT_DONE','BOOKING_CONFIRMED')
                                   AND handed_off_at >= (NOW() - INTERVAL '48 hours'))
                                                                    AS newly_assigned,
                COUNT(*) FILTER (WHERE status = 'FOLLOW_UP_AFTER_VISIT')
                                                                    AS follow_up_after_visit,
                COUNT(*) FILTER (WHERE status = 'NEGOTIATION')      AS negotiation,
                COUNT(*) FILTER (WHERE status = 'PAYMENT_PENDING')  AS payment_pending,
                COUNT(*) FILTER (WHERE status = 'BOOKING_CONFIRMED') AS booking_confirmed,
                COUNT(*) FILTER (WHERE status = 'DOCUMENT_PENDING') AS document_pending,
                COUNT(*) FILTER (WHERE status = 'ADMISSION_IN_PROGRESS')
                                                                    AS admission_in_progress,
                COUNT(*) FILTER (WHERE status = 'NOT_INTERESTED')   AS not_interested,
                COUNT(*) FILTER (WHERE delivery_mode = 'ONLINE'
                                   AND status NOT IN ('ADMISSION_DONE','CLOSED'))
                                                                    AS online_active,
                COUNT(*) FILTER (WHERE delivery_mode = 'OFFLINE'
                                   AND status NOT IN ('ADMISSION_DONE','CLOSED'))
                                                                    AS offline_active,
                COUNT(*) FILTER (WHERE delivery_mode = 'ONLINE'
                                   AND status NOT IN ('ADMISSION_DONE','CLOSED'))
                                                                    AS online_pending,
                COUNT(*) FILTER (WHERE delivery_mode = 'OFFLINE'
                                   AND status NOT IN ('ADMISSION_DONE','CLOSED'))
                                                                    AS offline_pending
            FROM leads
            WHERE institute_id  = :iid
              AND counsellor_id = :counsellorId
              AND deleted_at    IS NULL
            """;

        long myActiveLeads = 0, newlyAssigned = 0, followUpAfterVisit = 0,
             negotiation = 0, paymentPending = 0, bookingConfirmed = 0,
             documentPending = 0, admissionInProgress = 0, notInterested = 0,
             onlineActive = 0, offlineActive = 0,
             onlinePending = 0, offlinePending = 0;

        var leadRows = jdbc.queryForList(leadSql, p);
        if (!leadRows.isEmpty()) {
            var r = leadRows.get(0);
            myActiveLeads       = toLong(r.get("my_active"));
            newlyAssigned       = toLong(r.get("newly_assigned"));
            followUpAfterVisit  = toLong(r.get("follow_up_after_visit"));
            negotiation         = toLong(r.get("negotiation"));
            paymentPending      = toLong(r.get("payment_pending"));
            bookingConfirmed    = toLong(r.get("booking_confirmed"));
            documentPending     = toLong(r.get("document_pending"));
            admissionInProgress = toLong(r.get("admission_in_progress"));
            notInterested       = toLong(r.get("not_interested"));
            onlineActive        = toLong(r.get("online_active"));
            offlineActive       = toLong(r.get("offline_active"));
            onlinePending       = toLong(r.get("online_pending"));
            offlinePending      = toLong(r.get("offline_pending"));
        }

        // ── 2. Follow-ups scoped to counsellor's leads ────────────────────────
        String fuSql = """
            SELECT
                COUNT(*) FILTER (WHERE DATE(f.scheduled_at) = :today)  AS today_fu,
                COUNT(*) FILTER (WHERE DATE(f.scheduled_at) < :today)  AS overdue_fu
            FROM follow_ups f
            JOIN leads l ON l.id = f.lead_id
            WHERE l.institute_id  = :iid
              AND l.counsellor_id = :counsellorId
              AND l.deleted_at    IS NULL
              AND f.is_done       = FALSE
            """;

        long todayFollowUps = 0, overdueFollowUps = 0;
        var fuRows = jdbc.queryForList(fuSql, p);
        if (!fuRows.isEmpty()) {
            var r = fuRows.get(0);
            todayFollowUps   = toLong(r.get("today_fu"));
            overdueFollowUps = toLong(r.get("overdue_fu"));
        }

        // ── 3. Admissions scoped to counsellor (via lead.counsellor_id) ───────
        String admSql = """
            SELECT
                COUNT(*) FILTER (WHERE DATE(a.created_at) >= :som
                                   AND DATE(a.created_at) <= :today)
                                                                AS done_this_month,
                COUNT(*)                                        AS done_all_time,
                COUNT(*) FILTER (WHERE a.status NOT IN ('CANCELLED'))
                                                                AS pending_admissions,
                COUNT(*) FILTER (WHERE l.delivery_mode = 'ONLINE'
                                   AND DATE(a.created_at) >= :som
                                   AND DATE(a.created_at) <= :today)
                                                                AS online_this_month,
                COUNT(*) FILTER (WHERE l.delivery_mode = 'OFFLINE'
                                   AND DATE(a.created_at) >= :som
                                   AND DATE(a.created_at) <= :today)
                                                                AS offline_this_month
            FROM admissions a
            JOIN leads l ON l.id = a.lead_id
            WHERE a.institute_id  = :iid
              AND l.counsellor_id = :counsellorId
              AND a.deleted_at    IS NULL
            """;

        long donThisMonth = 0, doneAllTime = 0, pendingAdmissions = 0,
             onlineThisMonth = 0, offlineThisMonth = 0;

        var admRows = jdbc.queryForList(admSql, p);
        if (!admRows.isEmpty()) {
            var r = admRows.get(0);
            donThisMonth     = toLong(r.get("done_this_month"));
            doneAllTime      = toLong(r.get("done_all_time"));
            pendingAdmissions= toLong(r.get("pending_admissions"));
            onlineThisMonth  = toLong(r.get("online_this_month"));
            offlineThisMonth = toLong(r.get("offline_this_month"));
        }

        // ── 4. Revenue (fees_paid from linked admissions) ─────────────────────
        String revSql = """
            SELECT
                COALESCE(SUM(a.fees_paid) FILTER (
                    WHERE DATE(a.created_at) >= :som
                      AND DATE(a.created_at) <= :today), 0)     AS rev_month,
                COALESCE(SUM(a.fees_paid), 0)                   AS rev_total,
                COALESCE(SUM(GREATEST(a.fees_agreed - a.fees_paid, 0))
                    FILTER (WHERE a.status NOT IN ('CANCELLED','COMPLETED')), 0)
                                                                AS outstanding
            FROM admissions a
            JOIN leads l ON l.id = a.lead_id
            WHERE a.institute_id  = :iid
              AND l.counsellor_id = :counsellorId
              AND a.deleted_at    IS NULL
            """;

        BigDecimal revenueThisMonth = BigDecimal.ZERO;
        BigDecimal revenueAllTime   = BigDecimal.ZERO;
        BigDecimal feesOutstanding  = BigDecimal.ZERO;

        var revRows = jdbc.queryForList(revSql, p);
        if (!revRows.isEmpty()) {
            var r = revRows.get(0);
            revenueThisMonth = r.get("rev_month")   instanceof BigDecimal v ? v : BigDecimal.ZERO;
            revenueAllTime   = r.get("rev_total")   instanceof BigDecimal v ? v : BigDecimal.ZERO;
            feesOutstanding  = r.get("outstanding") instanceof BigDecimal v ? v : BigDecimal.ZERO;
        }

        return CounsellorDashboardResponse.builder()
            .myActiveLeads(myActiveLeads)
            .newlyAssigned(newlyAssigned)
            .followUpAfterVisit(followUpAfterVisit)
            .negotiation(negotiation)
            .paymentPending(paymentPending)
            .bookingConfirmed(bookingConfirmed)
            .documentPending(documentPending)
            .admissionInProgress(admissionInProgress)
            .notInterested(notInterested)
            .todayFollowUps(todayFollowUps)
            .overdueFollowUps(overdueFollowUps)
            .admissionsDoneThisMonth(donThisMonth)
            .admissionsDoneAllTime(doneAllTime)
            .pendingAdmissions(pendingAdmissions)
            .revenueThisMonth(revenueThisMonth)
            .revenueAllTime(revenueAllTime)
            .feesOutstanding(feesOutstanding)
            .onlineLeadsActive(onlineActive)
            .offlineLeadsActive(offlineActive)
            .onlineAdmissionsThisMonth(onlineThisMonth)
            .offlineAdmissionsThisMonth(offlineThisMonth)
            .onlineAdmissionsPending(onlinePending)
            .offlineAdmissionsPending(offlinePending)
            .build();
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private long q(String sql, MapSqlParameterSource p) {
        Long v = jdbc.queryForObject(sql, p, Long.class);
        return v == null ? 0L : v;
    }

    private BigDecimal bd(String sql, MapSqlParameterSource p) {
        BigDecimal v = jdbc.queryForObject(sql, p, BigDecimal.class);
        return v == null ? BigDecimal.ZERO : v;
    }
}
