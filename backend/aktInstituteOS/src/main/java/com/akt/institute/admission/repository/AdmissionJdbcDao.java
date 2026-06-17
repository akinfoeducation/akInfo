package com.akt.institute.admission.repository;

import com.akt.institute.admission.domain.Admission;
import com.akt.institute.admission.domain.AdmissionStatus;
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
public class AdmissionJdbcDao implements AdmissionDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_COLS = """
            id, uuid, admission_number, institute_id, lead_id, student_id,
            first_name, last_name, phone, email,
            course_name, batch_name, batch_id, fees_agreed, fees_paid, enrollment_date,
            status, notes, created_at, updated_at, created_by, updated_by, deleted_at
            """;

    static final RowMapper<Admission> ROW_MAPPER = AdmissionJdbcDao::mapRow;

    @Override
    public Admission save(Admission admission) {
        return admission.getId() == null ? insert(admission) : update(admission);
    }

    @Override
    public Optional<Admission> findByIdAndInstituteId(Long id, Long instituteId) {
        String sql = "SELECT " + SELECT_COLS
                + " FROM admissions WHERE id = :id AND institute_id = :instituteId AND deleted_at IS NULL";
        List<Admission> results = jdbc.query(sql,
                new MapSqlParameterSource().addValue("id", id).addValue("instituteId", instituteId),
                ROW_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public boolean existsByLeadIdAndInstituteId(Long leadId, Long instituteId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM admissions WHERE lead_id = :leadId AND institute_id = :instituteId AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("leadId", leadId).addValue("instituteId", instituteId),
                Long.class);
        return count != null && count > 0;
    }

    @Override
    public java.util.Optional<Long> findAdmissionIdByLeadId(Long leadId, Long instituteId) {
        List<Long> ids = jdbc.query(
                "SELECT id FROM admissions WHERE lead_id = :leadId AND institute_id = :instituteId AND deleted_at IS NULL LIMIT 1",
                new MapSqlParameterSource().addValue("leadId", leadId).addValue("instituteId", instituteId),
                (rs, n) -> rs.getLong("id"));
        return ids.isEmpty() ? java.util.Optional.empty() : java.util.Optional.of(ids.get(0));
    }

    @Override
    public List<Admission> findWithFilters(Long instituteId, String status, String q, boolean hasDues,
                                            int page, int size, String sortField, String sortDir) {
        var sql = new StringBuilder("SELECT " + SELECT_COLS
                + " FROM admissions WHERE deleted_at IS NULL AND institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, status, q, hasDues);
        String col = sanitizeSortField(sortField);
        String dir = "desc".equalsIgnoreCase(sortDir) ? "DESC" : "ASC";
        sql.append(" ORDER BY ").append(col).append(" ").append(dir);
        sql.append(" LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, ROW_MAPPER);
    }

    @Override
    public long countWithFilters(Long instituteId, String status, String q, boolean hasDues) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM admissions WHERE deleted_at IS NULL AND institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, status, q, hasDues);
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public long countByInstituteIdAndStatus(Long instituteId, AdmissionStatus status) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM admissions WHERE institute_id = :instituteId AND status = :status AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("instituteId", instituteId).addValue("status", status.name()),
                Long.class);
        return count == null ? 0L : count;
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private static void applyFilters(StringBuilder sql, MapSqlParameterSource params,
                                     String status, String q, boolean hasDues) {
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = :status");
            params.addValue("status", status);
        }
        if (hasDues) {
            // Only show admissions where outstanding > 0 and not cancelled/completed with no balance
            sql.append(" AND fees_agreed > fees_paid AND status NOT IN ('CANCELLED')");
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.toLowerCase().trim() + "%";
            String rawPattern = "%" + q.trim() + "%";
            sql.append("""
                     AND (LOWER(first_name) LIKE :q
                          OR LOWER(COALESCE(last_name, '')) LIKE :q
                          OR phone LIKE :qRaw
                          OR LOWER(COALESCE(email, '')) LIKE :q
                          OR LOWER(COALESCE(course_name, '')) LIKE :q
                          OR admission_number LIKE :qRaw)
                    """);
            params.addValue("q", pattern).addValue("qRaw", rawPattern);
        }
    }

    private static String sanitizeSortField(String field) {
        return switch (field == null ? "created_at" : field) {
            case "admissionNumber", "admission_number" -> "admission_number";
            case "firstName",       "first_name"       -> "first_name";
            case "lastName",        "last_name"        -> "last_name";
            case "status"                              -> "status";
            case "enrollmentDate",  "enrollment_date"  -> "enrollment_date";
            case "feesAgreed",      "fees_agreed"      -> "fees_agreed";
            default                                    -> "created_at";
        };
    }

    private Admission insert(Admission a) {
        String sql = """
                INSERT INTO admissions (
                    uuid, admission_number, institute_id, lead_id, student_id,
                    first_name, last_name, phone, email,
                    course_name, batch_name, batch_id, fees_agreed, fees_paid, enrollment_date,
                    status, notes, created_at, updated_at, created_by, updated_by)
                VALUES (
                    :uuid, :admissionNumber, :instituteId, :leadId, :studentId,
                    :firstName, :lastName, :phone, :email,
                    :courseName, :batchName, :batchId, :feesAgreed, :feesPaid, :enrollmentDate,
                    :status, :notes,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :createdBy, :updatedBy)
                """;
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(sql, buildParams(a), keyHolder, new String[]{"id"});
        a.setId(Objects.requireNonNull(keyHolder.getKeyAs(Long.class)));
        return a;
    }

    private Admission update(Admission a) {
        String sql = """
                UPDATE admissions SET
                    first_name = :firstName, last_name = :lastName,
                    phone = :phone, email = :email,
                    course_name = :courseName, batch_name = :batchName, batch_id = :batchId,
                    fees_agreed = :feesAgreed, fees_paid = :feesPaid,
                    enrollment_date = :enrollmentDate, student_id = :studentId,
                    status = :status, notes = :notes,
                    deleted_at = :deletedAt,
                    updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                WHERE id = :id
                """;
        jdbc.update(sql, buildParams(a)
                .addValue("id", a.getId())
                .addValue("deletedAt", toTs(a.getDeletedAt())));
        return a;
    }

    private static MapSqlParameterSource buildParams(Admission a) {
        Long actor = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("uuid",            a.getUuid())
                .addValue("admissionNumber", a.getAdmissionNumber())
                .addValue("instituteId",     a.getInstituteId())
                .addValue("leadId",          a.getLeadId())
                .addValue("studentId",       a.getStudentId())
                .addValue("firstName",       a.getFirstName())
                .addValue("lastName",        a.getLastName())
                .addValue("phone",           a.getPhone())
                .addValue("email",           a.getEmail())
                .addValue("courseName",      a.getCourseName())
                .addValue("batchName",       a.getBatchName())
                .addValue("batchId",         a.getBatchId())
                .addValue("feesAgreed",      a.getFeesAgreed())
                .addValue("feesPaid",        a.getFeesPaid())
                .addValue("enrollmentDate",  a.getEnrollmentDate() != null ? Date.valueOf(a.getEnrollmentDate()) : null)
                .addValue("status",          a.getStatus() == null ? AdmissionStatus.PENDING.name() : a.getStatus().name())
                .addValue("notes",           a.getNotes())
                .addValue("createdBy",       actor)
                .addValue("updatedBy",       actor);
    }

    static Admission mapRow(ResultSet rs, int rowNum) throws SQLException {
        Admission a = new Admission();
        a.setId(rs.getLong("id"));
        a.setUuid(rs.getString("uuid"));
        a.setAdmissionNumber(rs.getString("admission_number"));
        a.setInstituteId(rs.getLong("institute_id"));
        a.setLeadId(rs.getLong("lead_id"));
        long studentId = rs.getLong("student_id");
        if (!rs.wasNull()) a.setStudentId(studentId);
        a.setFirstName(rs.getString("first_name"));
        a.setLastName(rs.getString("last_name"));
        a.setPhone(rs.getString("phone"));
        a.setEmail(rs.getString("email"));
        a.setCourseName(rs.getString("course_name"));
        a.setBatchName(rs.getString("batch_name"));
        long batchId = rs.getLong("batch_id");
        if (!rs.wasNull()) a.setBatchId(batchId);
        BigDecimal feesAgreed = rs.getBigDecimal("fees_agreed");
        a.setFeesAgreed(feesAgreed != null ? feesAgreed : BigDecimal.ZERO);
        BigDecimal feesPaid = rs.getBigDecimal("fees_paid");
        a.setFeesPaid(feesPaid != null ? feesPaid : BigDecimal.ZERO);
        Date enrollmentDate = rs.getDate("enrollment_date");
        if (enrollmentDate != null) a.setEnrollmentDate(enrollmentDate.toLocalDate());
        String status = rs.getString("status");
        if (status != null) a.setStatus(AdmissionStatus.valueOf(status));
        a.setNotes(rs.getString("notes"));
        a.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        a.setUpdatedAt(toInstant(rs.getTimestamp("updated_at")));
        a.setDeletedAt(toInstant(rs.getTimestamp("deleted_at")));
        long createdBy = rs.getLong("created_by");
        if (!rs.wasNull()) a.setCreatedBy(createdBy);
        long updatedBy = rs.getLong("updated_by");
        if (!rs.wasNull()) a.setUpdatedBy(updatedBy);
        return a;
    }

    private static Instant toInstant(Timestamp ts) { return ts == null ? null : ts.toInstant(); }
    private static Timestamp toTs(Instant i)        { return i  == null ? null : Timestamp.from(i); }
}
