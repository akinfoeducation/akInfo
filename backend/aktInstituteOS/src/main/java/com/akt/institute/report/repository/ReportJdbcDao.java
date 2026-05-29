package com.akt.institute.report.repository;

import com.akt.institute.report.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ReportJdbcDao implements ReportDao {

    private final NamedParameterJdbcTemplate jdbc;
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("MMM yyyy");
    private static final DateTimeFormatter DAY_FMT   = DateTimeFormatter.ofPattern("EEE, dd MMM");

    // ── Summary ──────────────────────────────────────────────────────────────

    @Override
    public ReportSummary summary(Long instituteId, LocalDate from, LocalDate to) {
        long totalAdmissions = queryLong(
            "SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:from AND DATE(created_at)<=:to",
            base(instituteId).addValue("from", d(from)).addValue("to", d(to)));

        BigDecimal collected = queryBD(
            "SELECT COALESCE(SUM(amount),0) FROM fee_payments WHERE institute_id=:iid AND deleted_at IS NULL AND payment_date>=:from AND payment_date<=:to",
            base(instituteId).addValue("from", d(from)).addValue("to", d(to)));

        BigDecimal pending = queryBD(
            "SELECT COALESCE(SUM(fees_agreed-fees_paid),0) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND status NOT IN ('CANCELLED','COMPLETED') AND (fees_agreed-fees_paid)>0",
            base(instituteId));

        long partial = queryLong(
            "SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND fees_paid>0 AND fees_paid<fees_agreed AND status NOT IN ('CANCELLED','COMPLETED')",
            base(instituteId));

        BigDecimal expenses = queryBD(
            "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE institute_id=:iid AND deleted_at IS NULL AND expense_date>=:from AND expense_date<=:to",
            base(instituteId).addValue("from", d(from)).addValue("to", d(to)));

        return ReportSummary.builder()
            .totalAdmissions(totalAdmissions)
            .totalFeeCollected(collected)
            .pendingFees(pending)
            .partialPayments(partial)
            .totalExpenses(expenses)
            .netRevenue(collected.subtract(expenses))
            .build();
    }

    // ── 1. Admission report ──────────────────────────────────────────────────

    @Override
    public List<AdmissionReportRow> admissionReport(Long iid, LocalDate from, LocalDate to,
            String status, String course, String batch, String counsellorId,
            String q, int page, int size, String sort, String dir) {
        var sql = new StringBuilder("""
            SELECT a.id, a.admission_number,
                   CONCAT(a.first_name, CASE WHEN a.last_name IS NOT NULL THEN ' '||a.last_name ELSE '' END) AS student_name,
                   a.phone, a.course_name, a.batch_name,
                   a.fees_agreed, a.fees_paid, (a.fees_agreed - a.fees_paid) AS fees_due,
                   a.status, a.enrollment_date, a.created_at,
                   CONCAT(u.first_name, CASE WHEN u.last_name IS NOT NULL THEN ' '||u.last_name ELSE '' END) AS counsellor_name
            FROM admissions a
            LEFT JOIN leads l ON l.id = a.lead_id
            LEFT JOIN users u ON u.id = l.assigned_to_id
            WHERE a.institute_id=:iid AND a.deleted_at IS NULL
              AND DATE(a.created_at)>=:from AND DATE(a.created_at)<=:to
            """);
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(status))      { sql.append(" AND a.status=:status");          p.addValue("status", status.toUpperCase()); }
        if (notBlank(course))      { sql.append(" AND a.course_name ILIKE :course"); p.addValue("course", "%"+course.trim()+"%"); }
        if (notBlank(batch))       { sql.append(" AND a.batch_name ILIKE :batch");   p.addValue("batch",  "%"+batch.trim()+"%"); }
        if (notBlank(counsellorId)){ sql.append(" AND l.assigned_to_id=:cid");       p.addValue("cid", Long.parseLong(counsellorId)); }
        if (notBlank(q))           { sql.append(" AND (CONCAT(a.first_name,' ',COALESCE(a.last_name,'')) ILIKE :q OR a.phone ILIKE :q OR a.admission_number ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        String col = safeSortCol(sort, List.of("student_name","admission_number","fees_agreed","fees_paid","fees_due","status","created_at","enrollment_date"), "a.created_at");
        sql.append(" ORDER BY ").append(col).append(" ").append(safeDir(dir));
        sql.append(" LIMIT :size OFFSET :off");
        p.addValue("size", size).addValue("off", (long)page*size);
        return jdbc.query(sql.toString(), p, (rs,rn) -> {
            var row = new AdmissionReportRow();
            row.setId(rs.getLong("id"));
            row.setAdmissionNumber(rs.getString("admission_number"));
            row.setStudentName(rs.getString("student_name"));
            row.setPhone(rs.getString("phone"));
            row.setCourseName(rs.getString("course_name"));
            row.setBatchName(rs.getString("batch_name"));
            row.setFeesAgreed(rs.getBigDecimal("fees_agreed"));
            row.setFeesPaid(rs.getBigDecimal("fees_paid"));
            row.setFeesDue(rs.getBigDecimal("fees_due"));
            row.setStatus(rs.getString("status"));
            row.setCounsellorName(rs.getString("counsellor_name"));
            Date ed = rs.getDate("enrollment_date");
            row.setEnrollmentDate(ed != null ? ed.toString() : null);
            row.setCreatedAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant().toString() : null);
            return row;
        });
    }

    @Override
    public long admissionReportCount(Long iid, LocalDate from, LocalDate to,
            String status, String course, String batch, String counsellorId, String q) {
        var sql = new StringBuilder("""
            SELECT COUNT(1) FROM admissions a
            LEFT JOIN leads l ON l.id = a.lead_id
            WHERE a.institute_id=:iid AND a.deleted_at IS NULL
              AND DATE(a.created_at)>=:from AND DATE(a.created_at)<=:to
            """);
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(status))      { sql.append(" AND a.status=:status"); p.addValue("status", status.toUpperCase()); }
        if (notBlank(course))      { sql.append(" AND a.course_name ILIKE :course"); p.addValue("course","%"+course.trim()+"%"); }
        if (notBlank(batch))       { sql.append(" AND a.batch_name ILIKE :batch"); p.addValue("batch","%"+batch.trim()+"%"); }
        if (notBlank(counsellorId)){ sql.append(" AND l.assigned_to_id=:cid"); p.addValue("cid", Long.parseLong(counsellorId)); }
        if (notBlank(q))           { sql.append(" AND (CONCAT(a.first_name,' ',COALESCE(a.last_name,'')) ILIKE :q OR a.phone ILIKE :q OR a.admission_number ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        return queryLong(sql.toString(), p);
    }

    // ── 2. Fee collection report ─────────────────────────────────────────────

    @Override
    public List<FeeCollectionReportRow> feeCollectionReport(Long iid, LocalDate from, LocalDate to,
            String course, String mode, String q, int page, int size, String sort, String dir) {
        var sql = new StringBuilder("""
            SELECT fp.id, fp.receipt_number, fp.amount, fp.payment_date, fp.payment_mode, fp.reference_number,
                   a.admission_number,
                   CONCAT(a.first_name, CASE WHEN a.last_name IS NOT NULL THEN ' '||a.last_name ELSE '' END) AS student_name,
                   a.phone, a.course_name,
                   CONCAT(u.first_name, CASE WHEN u.last_name IS NOT NULL THEN ' '||u.last_name ELSE '' END) AS collected_by
            FROM fee_payments fp
            JOIN admissions a ON a.id=fp.admission_id
            LEFT JOIN users u ON u.id=fp.created_by
            WHERE fp.institute_id=:iid AND fp.deleted_at IS NULL
              AND fp.payment_date>=:from AND fp.payment_date<=:to
            """);
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(course)){ sql.append(" AND a.course_name ILIKE :course"); p.addValue("course","%"+course.trim()+"%"); }
        if (notBlank(mode))  { sql.append(" AND fp.payment_mode=:mode"); p.addValue("mode", mode.toUpperCase()); }
        if (notBlank(q))     { sql.append(" AND (CONCAT(a.first_name,' ',COALESCE(a.last_name,'')) ILIKE :q OR a.phone ILIKE :q OR fp.receipt_number ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        String col = safeSortCol(sort, List.of("amount","payment_date","student_name","receipt_number"), "fp.payment_date");
        sql.append(" ORDER BY ").append(col).append(" ").append(safeDir(dir));
        sql.append(" LIMIT :size OFFSET :off");
        p.addValue("size", size).addValue("off", (long)page*size);
        return jdbc.query(sql.toString(), p, (rs,rn) -> {
            var row = new FeeCollectionReportRow();
            row.setId(rs.getLong("id"));
            row.setReceiptNumber(rs.getString("receipt_number"));
            row.setAdmissionNumber(rs.getString("admission_number"));
            row.setStudentName(rs.getString("student_name"));
            row.setPhone(rs.getString("phone"));
            row.setCourseName(rs.getString("course_name"));
            row.setAmount(rs.getBigDecimal("amount"));
            Date pd = rs.getDate("payment_date");
            row.setPaymentDate(pd != null ? pd.toString() : null);
            row.setPaymentMode(rs.getString("payment_mode"));
            row.setReferenceNumber(rs.getString("reference_number"));
            row.setCollectedBy(rs.getString("collected_by"));
            return row;
        });
    }

    @Override
    public long feeCollectionReportCount(Long iid, LocalDate from, LocalDate to,
            String course, String mode, String q) {
        var sql = new StringBuilder("""
            SELECT COUNT(1) FROM fee_payments fp
            JOIN admissions a ON a.id=fp.admission_id
            WHERE fp.institute_id=:iid AND fp.deleted_at IS NULL
              AND fp.payment_date>=:from AND fp.payment_date<=:to
            """);
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(course)){ sql.append(" AND a.course_name ILIKE :course"); p.addValue("course","%"+course.trim()+"%"); }
        if (notBlank(mode))  { sql.append(" AND fp.payment_mode=:mode"); p.addValue("mode", mode.toUpperCase()); }
        if (notBlank(q))     { sql.append(" AND (CONCAT(a.first_name,' ',COALESCE(a.last_name,'')) ILIKE :q OR a.phone ILIKE :q OR fp.receipt_number ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        return queryLong(sql.toString(), p);
    }

    // ── 3. Pending fee report ────────────────────────────────────────────────

    @Override
    public List<PendingFeeReportRow> pendingFeeReport(Long iid, String course, String batch,
            String status, String q, int page, int size, String sort, String dir) {
        var sql = new StringBuilder("""
            SELECT a.id, a.admission_number,
                   CONCAT(a.first_name, CASE WHEN a.last_name IS NOT NULL THEN ' '||a.last_name ELSE '' END) AS student_name,
                   a.phone, a.course_name, a.batch_name,
                   a.fees_agreed, a.fees_paid, (a.fees_agreed-a.fees_paid) AS fees_due,
                   a.status, a.enrollment_date,
                   COALESCE(EXTRACT(DAY FROM NOW()-a.enrollment_date::timestamp),0)::INT AS days_since
            FROM admissions a
            WHERE a.institute_id=:iid AND a.deleted_at IS NULL
              AND (a.fees_agreed-a.fees_paid)>0
              AND a.status NOT IN ('CANCELLED','COMPLETED')
            """);
        var p = base(iid);
        if (notBlank(course)){ sql.append(" AND a.course_name ILIKE :course"); p.addValue("course","%"+course.trim()+"%"); }
        if (notBlank(batch)) { sql.append(" AND a.batch_name ILIKE :batch"); p.addValue("batch","%"+batch.trim()+"%"); }
        if (notBlank(status)){ sql.append(" AND a.status=:status"); p.addValue("status", status.toUpperCase()); }
        if (notBlank(q))     { sql.append(" AND (CONCAT(a.first_name,' ',COALESCE(a.last_name,'')) ILIKE :q OR a.phone ILIKE :q OR a.admission_number ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        String col = safeSortCol(sort, List.of("fees_due","fees_agreed","fees_paid","days_since","student_name"), "fees_due");
        sql.append(" ORDER BY ").append(col).append(" ").append(safeDir(dir));
        sql.append(" LIMIT :size OFFSET :off");
        p.addValue("size", size).addValue("off", (long)page*size);
        return jdbc.query(sql.toString(), p, (rs,rn) -> {
            var row = new PendingFeeReportRow();
            row.setId(rs.getLong("id"));
            row.setAdmissionNumber(rs.getString("admission_number"));
            row.setStudentName(rs.getString("student_name"));
            row.setPhone(rs.getString("phone"));
            row.setCourseName(rs.getString("course_name"));
            row.setBatchName(rs.getString("batch_name"));
            row.setFeesAgreed(rs.getBigDecimal("fees_agreed"));
            row.setFeesPaid(rs.getBigDecimal("fees_paid"));
            row.setFeesDue(rs.getBigDecimal("fees_due"));
            row.setStatus(rs.getString("status"));
            Date ed = rs.getDate("enrollment_date");
            row.setEnrollmentDate(ed != null ? ed.toString() : null);
            row.setDaysSinceEnrollment(rs.getInt("days_since"));
            return row;
        });
    }

    @Override
    public long pendingFeeReportCount(Long iid, String course, String batch, String status, String q) {
        var sql = new StringBuilder("""
            SELECT COUNT(1) FROM admissions a WHERE a.institute_id=:iid AND a.deleted_at IS NULL
              AND (a.fees_agreed-a.fees_paid)>0 AND a.status NOT IN ('CANCELLED','COMPLETED')
            """);
        var p = base(iid);
        if (notBlank(course)){ sql.append(" AND a.course_name ILIKE :course"); p.addValue("course","%"+course.trim()+"%"); }
        if (notBlank(batch)) { sql.append(" AND a.batch_name ILIKE :batch"); p.addValue("batch","%"+batch.trim()+"%"); }
        if (notBlank(status)){ sql.append(" AND a.status=:status"); p.addValue("status", status.toUpperCase()); }
        if (notBlank(q))     { sql.append(" AND (CONCAT(a.first_name,' ',COALESCE(a.last_name,'')) ILIKE :q OR a.phone ILIKE :q OR a.admission_number ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        return queryLong(sql.toString(), p);
    }

    // ── 4. Expense report ────────────────────────────────────────────────────

    @Override
    public List<ExpenseReportRow> expenseReport(Long iid, LocalDate from, LocalDate to,
            String category, String q, int page, int size, String sort, String dir) {
        var sql = new StringBuilder("""
            SELECT e.id, e.expense_number, e.category, e.description, e.amount,
                   e.expense_date, e.paid_to, e.payment_mode, e.reference_number,
                   CONCAT(u.first_name, CASE WHEN u.last_name IS NOT NULL THEN ' '||u.last_name ELSE '' END) AS created_by_name
            FROM expenses e
            LEFT JOIN users u ON u.id=e.created_by
            WHERE e.institute_id=:iid AND e.deleted_at IS NULL
              AND e.expense_date>=:from AND e.expense_date<=:to
            """);
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(category)){ sql.append(" AND e.category=:cat"); p.addValue("cat", category.toUpperCase()); }
        if (notBlank(q))       { sql.append(" AND (e.description ILIKE :q OR e.paid_to ILIKE :q OR e.expense_number ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        String col = safeSortCol(sort, List.of("amount","expense_date","category","description"), "e.expense_date");
        sql.append(" ORDER BY ").append(col).append(" ").append(safeDir(dir));
        sql.append(" LIMIT :size OFFSET :off");
        p.addValue("size", size).addValue("off", (long)page*size);
        return jdbc.query(sql.toString(), p, (rs,rn) -> {
            var row = new ExpenseReportRow();
            row.setId(rs.getLong("id"));
            row.setExpenseNumber(rs.getString("expense_number"));
            row.setCategory(rs.getString("category"));
            row.setDescription(rs.getString("description"));
            row.setAmount(rs.getBigDecimal("amount"));
            Date ed = rs.getDate("expense_date");
            row.setExpenseDate(ed != null ? ed.toString() : null);
            row.setPaidTo(rs.getString("paid_to"));
            row.setPaymentMode(rs.getString("payment_mode"));
            row.setReferenceNumber(rs.getString("reference_number"));
            row.setCreatedByName(rs.getString("created_by_name"));
            return row;
        });
    }

    @Override
    public long expenseReportCount(Long iid, LocalDate from, LocalDate to, String category, String q) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM expenses e WHERE e.institute_id=:iid AND e.deleted_at IS NULL AND e.expense_date>=:from AND e.expense_date<=:to");
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(category)){ sql.append(" AND e.category=:cat"); p.addValue("cat", category.toUpperCase()); }
        if (notBlank(q))       { sql.append(" AND (e.description ILIKE :q OR e.paid_to ILIKE :q OR e.expense_number ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        return queryLong(sql.toString(), p);
    }

    // ── 5. Daily collection ──────────────────────────────────────────────────

    @Override
    public List<DailyCollectionRow> dailyCollection(Long iid, LocalDate from, LocalDate to) {
        // fee_payments per day
        List<Map<String, Object>> feeRows = jdbc.queryForList(
            "SELECT payment_date::TEXT AS dt, COUNT(1) AS receipts, COALESCE(SUM(amount),0) AS total FROM fee_payments WHERE institute_id=:iid AND deleted_at IS NULL AND payment_date>=:from AND payment_date<=:to GROUP BY payment_date ORDER BY payment_date",
            base(iid).addValue("from", d(from)).addValue("to", d(to)));
        // expenses per day
        List<Map<String, Object>> expRows = jdbc.queryForList(
            "SELECT expense_date::TEXT AS dt, COALESCE(SUM(amount),0) AS total FROM expenses WHERE institute_id=:iid AND deleted_at IS NULL AND expense_date>=:from AND expense_date<=:to GROUP BY expense_date",
            base(iid).addValue("from", d(from)).addValue("to", d(to)));

        Map<String, BigDecimal> expMap = expRows.stream().collect(Collectors.toMap(
            r -> (String) r.get("dt"), r -> toBD(r.get("total"))));

        List<DailyCollectionRow> result = new ArrayList<>();
        for (var r : feeRows) {
            String dt        = (String) r.get("dt");
            long receipts    = toLong(r.get("receipts"));
            BigDecimal coll  = toBD(r.get("total"));
            BigDecimal exp   = expMap.getOrDefault(dt, BigDecimal.ZERO);
            LocalDate ld     = LocalDate.parse(dt);
            result.add(new DailyCollectionRow(dt, ld.format(DAY_FMT), receipts, coll, exp, coll.subtract(exp)));
        }
        return result;
    }

    // ── 6. Monthly revenue ───────────────────────────────────────────────────

    @Override
    public List<MonthlyDataPoint> monthlyRevenue(Long iid, int months) {
        List<YearMonth> window = window(months);
        LocalDate from = window.get(0).atDay(1);
        LocalDate to   = window.get(window.size()-1).atEndOfMonth();
        var rows = jdbc.queryForList(
            "SELECT TO_CHAR(DATE_TRUNC('month',payment_date),'Mon YYYY') AS lbl, EXTRACT(YEAR FROM payment_date)::INT AS yr, EXTRACT(MONTH FROM payment_date)::INT AS mo, COALESCE(SUM(amount),0) AS total FROM fee_payments WHERE institute_id=:iid AND deleted_at IS NULL AND payment_date>=:from AND payment_date<=:to GROUP BY 1,2,3 ORDER BY yr,mo",
            base(iid).addValue("from", d(from)).addValue("to", d(to)));
        Map<String,BigDecimal> lk = rows.stream().collect(Collectors.toMap(r->(String)r.get("lbl"), r->toBD(r.get("total")), (a,b)->a));
        return window.stream().map(ym -> { String lbl=ym.format(MONTH_FMT); return new MonthlyDataPoint(lbl,0,lk.getOrDefault(lbl,BigDecimal.ZERO)); }).toList();
    }

    @Override
    public List<MonthlyDataPoint> monthlyAdmissions(Long iid, int months) {
        List<YearMonth> window = window(months);
        LocalDate from = window.get(0).atDay(1);
        LocalDate to   = window.get(window.size()-1).atEndOfMonth();
        var rows = jdbc.queryForList(
            "SELECT TO_CHAR(DATE_TRUNC('month',created_at),'Mon YYYY') AS lbl, EXTRACT(YEAR FROM created_at)::INT AS yr, EXTRACT(MONTH FROM created_at)::INT AS mo, COUNT(1) AS total FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:from AND DATE(created_at)<=:to GROUP BY 1,2,3 ORDER BY yr,mo",
            base(iid).addValue("from", d(from)).addValue("to", d(to)));
        Map<String,Long> lk = rows.stream().collect(Collectors.toMap(r->(String)r.get("lbl"), r->toLong(r.get("total")), (a,b)->a));
        return window.stream().map(ym -> { String lbl=ym.format(MONTH_FMT); return new MonthlyDataPoint(lbl, lk.getOrDefault(lbl,0L), null); }).toList();
    }

    @Override
    public List<MonthlyDataPoint> monthlyLeads(Long iid, int months) {
        List<YearMonth> window = window(months);
        LocalDate from = window.get(0).atDay(1);
        LocalDate to   = window.get(window.size()-1).atEndOfMonth();
        var rows = jdbc.queryForList(
            "SELECT TO_CHAR(DATE_TRUNC('month',created_at),'Mon YYYY') AS lbl, EXTRACT(YEAR FROM created_at)::INT AS yr, EXTRACT(MONTH FROM created_at)::INT AS mo, COUNT(1) AS total FROM leads WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:from AND DATE(created_at)<=:to GROUP BY 1,2,3 ORDER BY yr,mo",
            base(iid).addValue("from", d(from)).addValue("to", d(to)));
        Map<String,Long> lk = rows.stream().collect(Collectors.toMap(r->(String)r.get("lbl"), r->toLong(r.get("total")), (a,b)->a));
        return window.stream().map(ym -> { String lbl=ym.format(MONTH_FMT); return new MonthlyDataPoint(lbl, lk.getOrDefault(lbl,0L), null); }).toList();
    }

    // ── 7. Batch-wise student report ─────────────────────────────────────────

    @Override
    public List<BatchStudentReportRow> batchStudentReport(Long iid, LocalDate from, LocalDate to, String courseName) {
        var sql = new StringBuilder("""
            SELECT COALESCE(a.course_name,'Unknown') AS course_name,
                   COALESCE(a.batch_name,'No Batch')  AS batch_name,
                   COUNT(1) AS total_admissions,
                   SUM(CASE WHEN a.status='ACTIVE' THEN 1 ELSE 0 END)     AS active,
                   SUM(CASE WHEN a.status='COMPLETED' THEN 1 ELSE 0 END)  AS completed,
                   SUM(CASE WHEN a.status='CANCELLED' THEN 1 ELSE 0 END)  AS cancelled,
                   COALESCE(SUM(a.fees_agreed),0) AS total_fees_agreed,
                   COALESCE(SUM(a.fees_paid),0)   AS total_fees_paid,
                   COALESCE(SUM(a.fees_agreed-a.fees_paid),0) AS total_fees_due
            FROM admissions a
            WHERE a.institute_id=:iid AND a.deleted_at IS NULL
              AND DATE(a.created_at)>=:from AND DATE(a.created_at)<=:to
            """);
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(courseName)){ sql.append(" AND a.course_name ILIKE :course"); p.addValue("course","%"+courseName.trim()+"%"); }
        sql.append(" GROUP BY course_name, batch_name ORDER BY total_admissions DESC");
        return jdbc.query(sql.toString(), p, (rs,rn) -> new BatchStudentReportRow(
            rs.getString("course_name"), rs.getString("batch_name"),
            rs.getLong("total_admissions"), rs.getLong("active"),
            rs.getLong("completed"), rs.getLong("cancelled"),
            rs.getBigDecimal("total_fees_agreed"), rs.getBigDecimal("total_fees_paid"),
            rs.getBigDecimal("total_fees_due")));
    }

    // ── 8. Enquiry conversion report ─────────────────────────────────────────

    @Override
    public List<EnquiryConversionRow> enquiryConversionReport(Long iid, LocalDate from, LocalDate to,
            String source, String counsellorId, String q, int page, int size, String sort, String dir) {
        var sql = new StringBuilder("""
            SELECT l.id,
                   CONCAT(l.first_name, CASE WHEN l.last_name IS NOT NULL THEN ' '||l.last_name ELSE '' END) AS lead_name,
                   l.phone, l.source, l.course_interested, l.status,
                   l.created_at, l.converted_at,
                   CASE WHEN l.converted_at IS NOT NULL THEN EXTRACT(DAY FROM l.converted_at - l.created_at)::INT ELSE -1 END AS days_to_convert,
                   COALESCE(a.fees_agreed, 0) AS admission_value,
                   CONCAT(u.first_name, CASE WHEN u.last_name IS NOT NULL THEN ' '||u.last_name ELSE '' END) AS counsellor_name
            FROM leads l
            LEFT JOIN admissions a ON a.lead_id=l.id AND a.deleted_at IS NULL
            LEFT JOIN users u ON u.id=l.assigned_to_id
            WHERE l.institute_id=:iid AND l.deleted_at IS NULL
              AND DATE(l.created_at)>=:from AND DATE(l.created_at)<=:to
            """);
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(source))      { sql.append(" AND l.source=:source"); p.addValue("source", source.toUpperCase()); }
        if (notBlank(counsellorId)){ sql.append(" AND l.assigned_to_id=:cid"); p.addValue("cid", Long.parseLong(counsellorId)); }
        if (notBlank(q))           { sql.append(" AND (CONCAT(l.first_name,' ',COALESCE(l.last_name,'')) ILIKE :q OR l.phone ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        String col = safeSortCol(sort, List.of("lead_name","source","status","days_to_convert","created_at"), "l.created_at");
        sql.append(" ORDER BY ").append(col).append(" ").append(safeDir(dir));
        sql.append(" LIMIT :size OFFSET :off");
        p.addValue("size", size).addValue("off", (long)page*size);
        return jdbc.query(sql.toString(), p, (rs,rn) -> {
            var row = new EnquiryConversionRow();
            row.setId(rs.getLong("id"));
            row.setLeadName(rs.getString("lead_name"));
            row.setPhone(rs.getString("phone"));
            row.setSource(rs.getString("source"));
            row.setCourseInterested(rs.getString("course_interested"));
            row.setStatus(rs.getString("status"));
            row.setCounsellorName(rs.getString("counsellor_name"));
            row.setCreatedAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant().toString() : null);
            row.setConvertedAt(rs.getTimestamp("converted_at") != null ? rs.getTimestamp("converted_at").toInstant().toString() : null);
            row.setDaysToConvert(rs.getInt("days_to_convert"));
            row.setAdmissionValue(rs.getBigDecimal("admission_value"));
            return row;
        });
    }

    @Override
    public long enquiryConversionReportCount(Long iid, LocalDate from, LocalDate to,
            String source, String counsellorId, String q) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM leads l WHERE l.institute_id=:iid AND l.deleted_at IS NULL AND DATE(l.created_at)>=:from AND DATE(l.created_at)<=:to");
        var p = base(iid).addValue("from", d(from)).addValue("to", d(to));
        if (notBlank(source))      { sql.append(" AND l.source=:source"); p.addValue("source", source.toUpperCase()); }
        if (notBlank(counsellorId)){ sql.append(" AND l.assigned_to_id=:cid"); p.addValue("cid", Long.parseLong(counsellorId)); }
        if (notBlank(q))           { sql.append(" AND (CONCAT(l.first_name,' ',COALESCE(l.last_name,'')) ILIKE :q OR l.phone ILIKE :q)"); p.addValue("q","%"+q.trim()+"%"); }
        return queryLong(sql.toString(), p);
    }

    // ── Existing overview methods ────────────────────────────────────────────

    @Override public long countLeads(Long i, LocalDate f, LocalDate t) {
        return queryLong("SELECT COUNT(1) FROM leads WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:from AND DATE(created_at)<=:to", base(i).addValue("from",d(f)).addValue("to",d(t)));
    }
    @Override public long countConvertedLeads(Long i, LocalDate f, LocalDate t) {
        return queryLong("SELECT COUNT(1) FROM leads WHERE institute_id=:iid AND deleted_at IS NULL AND status='CONVERTED' AND DATE(created_at)>=:from AND DATE(created_at)<=:to", base(i).addValue("from",d(f)).addValue("to",d(t)));
    }
    @Override public long countTotalLeads(Long i)       { return queryLong("SELECT COUNT(1) FROM leads WHERE institute_id=:iid AND deleted_at IS NULL", base(i)); }
    @Override public long countAdmissions(Long i, LocalDate f, LocalDate t) {
        return queryLong("SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:from AND DATE(created_at)<=:to", base(i).addValue("from",d(f)).addValue("to",d(t)));
    }
    @Override public long countTotalAdmissions(Long i)  { return queryLong("SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL", base(i)); }
    @Override public long countActiveAdmissions(Long i) { return queryLong("SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND status IN ('ENROLLED','ACTIVE')", base(i)); }
    @Override public BigDecimal sumRevenue(Long i, LocalDate f, LocalDate t) {
        return queryBD("SELECT COALESCE(SUM(amount),0) FROM fee_payments WHERE institute_id=:iid AND deleted_at IS NULL AND payment_date>=:from AND payment_date<=:to", base(i).addValue("from",d(f)).addValue("to",d(t)));
    }
    @Override public BigDecimal sumRevenueThisYear(Long i, int year) {
        return queryBD("SELECT COALESCE(SUM(amount),0) FROM fee_payments WHERE institute_id=:iid AND deleted_at IS NULL AND EXTRACT(YEAR FROM payment_date)=:year", base(i).addValue("year",year));
    }
    @Override public BigDecimal totalOutstanding(Long i) {
        return queryBD("SELECT COALESCE(SUM(fees_agreed-fees_paid),0) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND status NOT IN ('CANCELLED','COMPLETED')", base(i));
    }
    @Override public long countOverdue(Long i) {
        return queryLong("SELECT COUNT(1) FROM admissions WHERE institute_id=:iid AND deleted_at IS NULL AND status NOT IN ('CANCELLED','COMPLETED') AND (fees_agreed-fees_paid)>0", base(i));
    }
    @Override public long countTotalStudents(Long i) { return queryLong("SELECT COUNT(1) FROM students WHERE institute_id=:iid AND deleted_at IS NULL", base(i)); }

    @Override
    public List<LeadFunnelItem> leadsByStatus(Long iid, LocalDate from, LocalDate to) {
        var rows = jdbc.queryForList("SELECT status, COUNT(1) AS cnt FROM leads WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:from AND DATE(created_at)<=:to GROUP BY status ORDER BY cnt DESC", base(iid).addValue("from",d(from)).addValue("to",d(to)));
        return toFunnel(rows, "status");
    }
    @Override
    public List<LeadFunnelItem> leadsBySource(Long iid, LocalDate from, LocalDate to) {
        var rows = jdbc.queryForList("SELECT source, COUNT(1) AS cnt FROM leads WHERE institute_id=:iid AND deleted_at IS NULL AND DATE(created_at)>=:from AND DATE(created_at)<=:to GROUP BY source ORDER BY cnt DESC", base(iid).addValue("from",d(from)).addValue("to",d(to)));
        return toFunnel(rows, "source");
    }
    @Override
    public List<CourseBreakdownItem> courseBreakdown(Long iid, LocalDate from, LocalDate to) {
        return jdbc.query("""
            SELECT COALESCE(a.course_name,'Unknown') AS course_name, COUNT(DISTINCT a.id) AS admissions,
                   COALESCE(SUM(fp.amount),0) AS revenue_collected,
                   COALESCE(SUM(a.fees_agreed),0) AS fees_agreed,
                   COALESCE(SUM(a.fees_agreed-a.fees_paid),0) AS outstanding
            FROM admissions a
            LEFT JOIN fee_payments fp ON fp.admission_id=a.id AND fp.deleted_at IS NULL AND fp.payment_date>=:from AND fp.payment_date<=:to
            WHERE a.institute_id=:iid AND a.deleted_at IS NULL AND DATE(a.created_at)>=:from AND DATE(a.created_at)<=:to
            GROUP BY a.course_name ORDER BY admissions DESC""",
            base(iid).addValue("from",d(from)).addValue("to",d(to)),
            (rs,rn)->new CourseBreakdownItem(rs.getString("course_name"),rs.getLong("admissions"),rs.getBigDecimal("revenue_collected"),rs.getBigDecimal("fees_agreed"),rs.getBigDecimal("outstanding")));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static MapSqlParameterSource base(Long iid) { return new MapSqlParameterSource("iid", iid); }
    private static Date d(LocalDate ld) { return ld != null ? Date.valueOf(ld) : null; }
    private long queryLong(String sql, MapSqlParameterSource p) { Long v=jdbc.queryForObject(sql,p,Long.class); return v==null?0:v; }
    private BigDecimal queryBD(String sql, MapSqlParameterSource p) { BigDecimal v=jdbc.queryForObject(sql,p,BigDecimal.class); return v==null?BigDecimal.ZERO:v; }
    private static boolean notBlank(String s) { return s!=null && !s.isBlank(); }
    private static String safeDir(String d) { return "asc".equalsIgnoreCase(d) ? "ASC" : "DESC"; }
    private static String safeSortCol(String sort, List<String> allowed, String def) {
        if (sort==null) return def;
        return allowed.stream().filter(c->c.equalsIgnoreCase(sort)).findFirst().orElse(def);
    }
    private static List<YearMonth> window(int months) {
        YearMonth cur=YearMonth.now(); List<YearMonth> l=new ArrayList<>();
        for(int i=months-1;i>=0;i--) l.add(cur.minusMonths(i));
        return l;
    }
    private static List<LeadFunnelItem> toFunnel(List<Map<String,Object>> rows, String col) {
        long total=rows.stream().mapToLong(r->toLong(r.get("cnt"))).sum();
        return rows.stream().map(r->{ long cnt=toLong(r.get("cnt")); double pct=total==0?0:BigDecimal.valueOf(cnt*100.0/total).setScale(1,RoundingMode.HALF_UP).doubleValue(); return new LeadFunnelItem((String)r.get(col),cnt,pct); }).toList();
    }
    private static BigDecimal toBD(Object o) { if(o==null) return BigDecimal.ZERO; if(o instanceof BigDecimal bd) return bd; return new BigDecimal(o.toString()); }
    private static long toLong(Object o) { if(o==null) return 0L; if(o instanceof Long l) return l; if(o instanceof Number n) return n.longValue(); return Long.parseLong(o.toString()); }
}
