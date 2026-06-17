package com.akt.institute.fees.repository;

import com.akt.institute.fees.domain.FeePayment;
import com.akt.institute.fees.domain.PaymentMode;
import com.akt.institute.shared.util.AuditUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class FeePaymentJdbcDao implements FeePaymentDao {

    private final NamedParameterJdbcTemplate jdbc;

    // Join with admissions to get denormalized display fields
    private static final String SELECT_SQL = """
            SELECT fp.id, fp.uuid, fp.receipt_number, fp.institute_id, fp.admission_id,
                   fp.amount, fp.payment_date, fp.payment_mode, fp.reference_number,
                   fp.notes, fp.created_at, fp.deleted_at,
                   a.admission_number,
                   CONCAT(a.first_name, CASE WHEN a.last_name IS NOT NULL THEN ' ' || a.last_name ELSE '' END) AS student_name,
                   a.course_name
            FROM fee_payments fp
            JOIN admissions a ON a.id = fp.admission_id
            """;

    private static final RowMapper<FeePayment> ROW_MAPPER = FeePaymentJdbcDao::mapRow;

    @Override
    public FeePayment save(FeePayment p) {
        return p.getId() == null ? insert(p) : update(p);
    }

    @Override
    public Optional<FeePayment> findByIdAndInstituteId(Long id, Long instituteId) {
        String sql = SELECT_SQL + " WHERE fp.id = :id AND fp.institute_id = :instituteId AND fp.deleted_at IS NULL";
        List<FeePayment> results = jdbc.query(sql,
                new MapSqlParameterSource().addValue("id", id).addValue("instituteId", instituteId),
                ROW_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public List<FeePayment> findWithFilters(Long instituteId, Long admissionId,
                                             String paymentMode, LocalDate from, LocalDate to,
                                             int page, int size) {
        var sql = new StringBuilder(SELECT_SQL + " WHERE fp.deleted_at IS NULL AND fp.institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, admissionId, paymentMode, from, to);
        sql.append(" ORDER BY fp.payment_date DESC, fp.created_at DESC");
        sql.append(" LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, ROW_MAPPER);
    }

    @Override
    public long countWithFilters(Long instituteId, Long admissionId,
                                  String paymentMode, LocalDate from, LocalDate to) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM fee_payments fp WHERE fp.deleted_at IS NULL AND fp.institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, admissionId, paymentMode, from, to);
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public BigDecimal sumByInstituteIdAndDateRange(Long instituteId, LocalDate from, LocalDate to) {
        BigDecimal result = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM fee_payments WHERE institute_id = :instituteId AND deleted_at IS NULL AND payment_date >= :from AND payment_date <= :to",
                new MapSqlParameterSource()
                        .addValue("instituteId", instituteId)
                        .addValue("from", Date.valueOf(from))
                        .addValue("to", Date.valueOf(to)),
                BigDecimal.class);
        return result == null ? BigDecimal.ZERO : result;
    }

    @Override
    public BigDecimal sumByAdmissionId(Long admissionId) {
        BigDecimal result = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM fee_payments WHERE admission_id = :admissionId AND deleted_at IS NULL",
                new MapSqlParameterSource("admissionId", admissionId),
                BigDecimal.class);
        return result == null ? BigDecimal.ZERO : result;
    }

    @Override
    public long countByInstituteIdAndDate(Long instituteId, LocalDate date) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM fee_payments WHERE institute_id = :instituteId AND payment_date = :date AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("instituteId", instituteId).addValue("date", Date.valueOf(date)),
                Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public long countOverdueAdmissions(Long instituteId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM admissions WHERE institute_id = :instituteId AND deleted_at IS NULL AND status NOT IN ('CANCELLED','COMPLETED') AND (fees_agreed - fees_paid) > 0",
                new MapSqlParameterSource("instituteId", instituteId),
                Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public BigDecimal totalOutstanding(Long instituteId) {
        BigDecimal result = jdbc.queryForObject(
                "SELECT COALESCE(SUM(fees_agreed - fees_paid), 0) FROM admissions WHERE institute_id = :instituteId AND deleted_at IS NULL AND status NOT IN ('CANCELLED','COMPLETED')",
                new MapSqlParameterSource("instituteId", instituteId),
                BigDecimal.class);
        return result == null ? BigDecimal.ZERO : result;
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private static void applyFilters(StringBuilder sql, MapSqlParameterSource params,
                                     Long admissionId, String paymentMode,
                                     LocalDate from, LocalDate to) {
        if (admissionId != null) {
            sql.append(" AND fp.admission_id = :admissionId");
            params.addValue("admissionId", admissionId);
        }
        if (paymentMode != null && !paymentMode.isBlank()) {
            sql.append(" AND fp.payment_mode = :paymentMode");
            params.addValue("paymentMode", paymentMode.toUpperCase());
        }
        if (from != null) {
            sql.append(" AND fp.payment_date >= :from");
            params.addValue("from", Date.valueOf(from));
        }
        if (to != null) {
            sql.append(" AND fp.payment_date <= :to");
            params.addValue("to", Date.valueOf(to));
        }
    }

    private FeePayment insert(FeePayment p) {
        String sql = """
                INSERT INTO fee_payments (
                    uuid, receipt_number, institute_id, admission_id,
                    amount, payment_date, payment_mode, reference_number,
                    notes, created_at, updated_at, created_by, updated_by)
                VALUES (
                    :uuid, :receiptNumber, :instituteId, :admissionId,
                    :amount, :paymentDate, :paymentMode, :referenceNumber,
                    :notes, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :createdBy, :updatedBy)
                """;
        var kh = new GeneratedKeyHolder();
        jdbc.update(sql, buildParams(p), kh, new String[]{"id"});
        p.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return p;
    }

    private FeePayment update(FeePayment p) {
        jdbc.update(
                "UPDATE fee_payments SET deleted_at = :deletedAt, updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy WHERE id = :id",
                new MapSqlParameterSource()
                        .addValue("deletedAt", toTs(p.getDeletedAt()))
                        .addValue("updatedBy", AuditUtil.getCurrentUserId())
                        .addValue("id", p.getId()));
        return p;
    }

    private static MapSqlParameterSource buildParams(FeePayment p) {
        Long actor = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("uuid",            p.getUuid())
                .addValue("receiptNumber",   p.getReceiptNumber())
                .addValue("instituteId",     p.getInstituteId())
                .addValue("admissionId",     p.getAdmissionId())
                .addValue("amount",          p.getAmount())
                .addValue("paymentDate",     p.getPaymentDate() != null ? Date.valueOf(p.getPaymentDate()) : Date.valueOf(LocalDate.now()))
                .addValue("paymentMode",     p.getPaymentMode() == null ? PaymentMode.CASH.name() : p.getPaymentMode().name())
                .addValue("referenceNumber", p.getReferenceNumber())
                .addValue("notes",           p.getNotes())
                .addValue("createdBy",       actor)
                .addValue("updatedBy",       actor);
    }

    static FeePayment mapRow(ResultSet rs, int rn) throws SQLException {
        FeePayment p = new FeePayment();
        p.setId(rs.getLong("id"));
        p.setUuid(rs.getString("uuid"));
        p.setReceiptNumber(rs.getString("receipt_number"));
        p.setInstituteId(rs.getLong("institute_id"));
        p.setAdmissionId(rs.getLong("admission_id"));
        p.setAmount(rs.getBigDecimal("amount"));
        Date pd = rs.getDate("payment_date");
        if (pd != null) p.setPaymentDate(pd.toLocalDate());
        String mode = rs.getString("payment_mode");
        if (mode != null) p.setPaymentMode(PaymentMode.fromString(mode));
        p.setReferenceNumber(rs.getString("reference_number"));
        p.setNotes(rs.getString("notes"));
        p.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        p.setDeletedAt(toInstant(rs.getTimestamp("deleted_at")));
        p.setAdmissionNumber(rs.getString("admission_number"));
        p.setStudentName(rs.getString("student_name"));
        p.setCourseName(rs.getString("course_name"));
        return p;
    }

    // ── Faculty-scoped admission fee rows ────────────────────────────────────

    private static final String FACULTY_ADMISSION_SQL = """
            SELECT a.id            AS admission_id,
                   a.admission_number,
                   a.student_id,
                   CONCAT(a.first_name, CASE WHEN a.last_name IS NOT NULL THEN ' '||a.last_name ELSE '' END) AS student_name,
                   a.phone,
                   a.batch_id,
                   b.name          AS batch_name,
                   a.course_name,
                   a.fees_agreed,
                   a.fees_paid,
                   (a.fees_agreed - a.fees_paid) AS fees_due,
                   CASE WHEN (a.fees_agreed - a.fees_paid) <= 0 THEN 'PAID'
                        WHEN a.fees_paid > 0                   THEN 'PARTIAL'
                        ELSE 'PENDING' END         AS fee_status,
                   (SELECT fp.payment_date::TEXT FROM fee_payments fp
                     WHERE fp.admission_id=a.id AND fp.deleted_at IS NULL
                     ORDER BY fp.payment_date DESC LIMIT 1) AS last_payment_date,
                   a.enrollment_date::TEXT          AS enrollment_date,
                   a.status                        AS admission_status
            FROM admissions a
            JOIN batch_faculty bf ON bf.batch_id = a.batch_id
            LEFT JOIN batches   b  ON b.id = a.batch_id
            WHERE bf.faculty_user_id = :fid AND bf.is_active = true
              AND a.institute_id = :iid
              AND a.deleted_at IS NULL
              AND a.status NOT IN ('CANCELLED')
            """;

    @Override
    public List<com.akt.institute.fees.dto.FacultyAdmissionFeeRow> findFacultyAdmissions(
            Long instituteId, Long facultyUserId, String type, int page, int size) {
        var sql = new StringBuilder(FACULTY_ADMISSION_SQL);
        var params = new MapSqlParameterSource()
                .addValue("iid", instituteId)
                .addValue("fid", facultyUserId);
        applyFeeTypeFilter(sql, params, type);
        sql.append(" ORDER BY fees_due DESC, a.created_at DESC");
        sql.append(" LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, FACULTY_FEE_MAPPER);
    }

    @Override
    public long countFacultyAdmissions(Long instituteId, Long facultyUserId, String type) {
        var sql = new StringBuilder(
                "SELECT COUNT(1) FROM admissions a JOIN batch_faculty bf ON bf.batch_id=a.batch_id"
                + " WHERE bf.faculty_user_id=:fid AND bf.is_active=true"
                + "   AND a.institute_id=:iid AND a.deleted_at IS NULL AND a.status NOT IN ('CANCELLED')");
        var params = new MapSqlParameterSource()
                .addValue("iid", instituteId)
                .addValue("fid", facultyUserId);
        applyFeeTypeFilter(sql, params, type);
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public List<com.akt.institute.fees.dto.FacultyAdmissionFeeRow> findFacultyStudentAdmissions(
            Long instituteId, Long facultyUserId, Long studentId) {
        String sql = FACULTY_ADMISSION_SQL + " AND a.student_id = :sid ORDER BY a.created_at DESC";
        return jdbc.query(sql,
                new MapSqlParameterSource()
                        .addValue("iid", instituteId)
                        .addValue("fid", facultyUserId)
                        .addValue("sid", studentId),
                FACULTY_FEE_MAPPER);
    }

    private static void applyFeeTypeFilter(StringBuilder sql, MapSqlParameterSource params, String type) {
        if ("pending".equalsIgnoreCase(type)) {
            sql.append(" AND (a.fees_agreed - a.fees_paid) > 0");
        } else if ("collected".equalsIgnoreCase(type)) {
            sql.append(" AND a.fees_paid > 0");
        }
    }

    private static final org.springframework.jdbc.core.RowMapper<com.akt.institute.fees.dto.FacultyAdmissionFeeRow>
            FACULTY_FEE_MAPPER = (rs, rn) -> {
        long sid = rs.getLong("student_id");
        return com.akt.institute.fees.dto.FacultyAdmissionFeeRow.builder()
                .admissionId(rs.getLong("admission_id"))
                .admissionNumber(rs.getString("admission_number"))
                .studentId(rs.wasNull() ? null : sid)
                .studentName(rs.getString("student_name"))
                .phone(rs.getString("phone"))
                .batchId(rs.getLong("batch_id"))
                .batchName(rs.getString("batch_name"))
                .courseName(rs.getString("course_name"))
                .feesAgreed(rs.getBigDecimal("fees_agreed"))
                .feesPaid(rs.getBigDecimal("fees_paid"))
                .feesDue(rs.getBigDecimal("fees_due"))
                .feeStatus(rs.getString("fee_status"))
                .lastPaymentDate(rs.getString("last_payment_date"))
                .enrollmentDate(rs.getString("enrollment_date"))
                .admissionStatus(rs.getString("admission_status"))
                .build();
    };

    private static Instant toInstant(Timestamp ts) { return ts == null ? null : ts.toInstant(); }
    private static Timestamp toTs(Instant i)        { return i  == null ? null : Timestamp.from(i); }
}
