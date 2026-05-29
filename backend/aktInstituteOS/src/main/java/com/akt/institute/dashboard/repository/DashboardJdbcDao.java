package com.akt.institute.dashboard.repository;

import com.akt.institute.dashboard.dto.DashboardRecentResponse.*;
import com.akt.institute.dashboard.dto.DashboardSummaryResponse;
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
