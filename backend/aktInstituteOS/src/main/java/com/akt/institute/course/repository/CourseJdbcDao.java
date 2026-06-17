package com.akt.institute.course.repository;

import com.akt.institute.course.domain.Batch;
import com.akt.institute.course.domain.BatchStatus;
import com.akt.institute.course.domain.Course;
import com.akt.institute.course.domain.CourseStatus;
import com.akt.institute.course.dto.BatchAssignmentHistoryRow;
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
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class CourseJdbcDao implements CourseDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String COURSE_COLS = """
            id, uuid, institute_id, name, code, description,
            duration_weeks, fees, status, created_at, updated_at, deleted_at
            """;

    private static final String BATCH_COLS = """
            b.id, b.uuid, b.institute_id, b.course_id, b.name, b.batch_code,
            b.mode, b.faculty_name, b.timing,
            b.start_date, b.end_date, b.max_capacity, b.status, b.created_at, b.deleted_at,
            c.name AS course_name, c.code AS course_code,
            COALESCE(ec.enrolled_count, 0) AS enrolled_count
            """;

    private static final String BATCH_FROM = """
            FROM batches b
            LEFT JOIN courses c ON c.id = b.course_id
            LEFT JOIN (
                SELECT batch_id, COUNT(1) AS enrolled_count
                FROM admissions
                WHERE deleted_at IS NULL AND status NOT IN ('CANCELLED')
                  AND batch_id IS NOT NULL
                GROUP BY batch_id
            ) ec ON ec.batch_id = b.id
            """;

    private static final RowMapper<Course> COURSE_MAPPER = CourseJdbcDao::mapCourse;
    private static final RowMapper<Batch>  BATCH_MAPPER  = CourseJdbcDao::mapBatch;

    // ── Course ───────────────────────────────────────────────────────────────

    @Override
    public Course saveCourse(Course course) {
        return course.getId() == null ? insertCourse(course) : updateCourse(course);
    }

    @Override
    public Optional<Course> findCourseByIdAndInstituteId(Long id, Long instituteId) {
        String sql = "SELECT " + COURSE_COLS
                + " FROM courses WHERE id = :id AND institute_id = :instituteId AND deleted_at IS NULL";
        List<Course> results = jdbc.query(sql,
                new MapSqlParameterSource().addValue("id", id).addValue("instituteId", instituteId),
                COURSE_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public boolean existsByCodeAndInstituteId(String code, Long instituteId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM courses WHERE UPPER(code) = UPPER(:code) AND institute_id = :instituteId AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("code", code).addValue("instituteId", instituteId),
                Long.class);
        return count != null && count > 0;
    }

    @Override
    public List<Course> findCoursesByInstituteId(Long instituteId, String status) {
        var sql = new StringBuilder("SELECT " + COURSE_COLS
                + " FROM courses WHERE institute_id = :instituteId AND deleted_at IS NULL");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = :status");
            params.addValue("status", status);
        }
        sql.append(" ORDER BY name ASC");
        return jdbc.query(sql.toString(), params, COURSE_MAPPER);
    }

    @Override
    public int countBatchesByCourseId(Long courseId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM batches WHERE course_id = :courseId AND deleted_at IS NULL",
                new MapSqlParameterSource("courseId", courseId), Long.class);
        return count == null ? 0 : count.intValue();
    }

    @Override
    public void deleteCourse(Long id) {
        jdbc.update("UPDATE courses SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id",
                new MapSqlParameterSource("id", id));
    }

    // ── Batch ────────────────────────────────────────────────────────────────

    @Override
    public Batch saveBatch(Batch batch) {
        return batch.getId() == null ? insertBatch(batch) : updateBatch(batch);
    }

    @Override
    public Optional<Batch> findBatchByIdAndCourseId(Long id, Long courseId, Long instituteId) {
        String sql = "SELECT " + BATCH_COLS + BATCH_FROM
                + " WHERE b.id=:id AND b.course_id=:courseId AND b.institute_id=:instituteId AND b.deleted_at IS NULL";
        List<Batch> results = jdbc.query(sql,
                new MapSqlParameterSource().addValue("id", id).addValue("courseId", courseId).addValue("instituteId", instituteId),
                BATCH_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public Optional<Batch> findBatchByIdAndInstituteId(Long id, Long instituteId) {
        String sql = "SELECT " + BATCH_COLS + BATCH_FROM
                + " WHERE b.id=:id AND b.institute_id=:instituteId AND b.deleted_at IS NULL";
        List<Batch> results = jdbc.query(sql,
                new MapSqlParameterSource().addValue("id", id).addValue("instituteId", instituteId),
                BATCH_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public List<Batch> findBatchesByCourseId(Long courseId, Long instituteId) {
        String sql = "SELECT " + BATCH_COLS + BATCH_FROM
                + " WHERE b.course_id=:courseId AND b.institute_id=:instituteId AND b.deleted_at IS NULL"
                + " ORDER BY b.start_date DESC NULLS LAST, b.name ASC";
        return jdbc.query(sql,
                new MapSqlParameterSource().addValue("courseId", courseId).addValue("instituteId", instituteId),
                BATCH_MAPPER);
    }

    @Override
    public List<Batch> findBatchesByInstituteId(Long instituteId, String status) {
        var sql = new StringBuilder("SELECT " + BATCH_COLS + BATCH_FROM
                + " WHERE b.institute_id=:instituteId AND b.deleted_at IS NULL");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        if (status != null && !status.isBlank()) {
            sql.append(" AND b.status=:status");
            params.addValue("status", status.toUpperCase());
        }
        sql.append(" ORDER BY b.status ASC, b.start_date DESC NULLS LAST, b.name ASC");
        return jdbc.query(sql.toString(), params, BATCH_MAPPER);
    }

    @Override
    public List<Batch> findBatchesByFacultyUserId(Long instituteId, Long facultyUserId) {
        String sql = "SELECT " + BATCH_COLS + BATCH_FROM
                + " JOIN batch_faculty bf ON bf.batch_id = b.id"
                + " WHERE b.institute_id = :instituteId AND b.deleted_at IS NULL"
                + "   AND bf.faculty_user_id = :facultyUserId AND bf.is_active = true"
                + " ORDER BY b.status ASC, b.start_date DESC NULLS LAST, b.name ASC";
        return jdbc.query(sql,
                new MapSqlParameterSource()
                        .addValue("instituteId", instituteId)
                        .addValue("facultyUserId", facultyUserId),
                BATCH_MAPPER);
    }

    @Override
    public List<Course> findCoursesByFacultyUserId(Long instituteId, Long facultyUserId) {
        String sql = "SELECT " + COURSE_COLS + " FROM courses WHERE deleted_at IS NULL AND institute_id = :instituteId"
                + " AND id IN ("
                + "   SELECT DISTINCT b.course_id FROM batches b"
                + "   JOIN batch_faculty bf ON bf.batch_id = b.id"
                + "   WHERE bf.faculty_user_id = :facultyUserId AND bf.is_active = true AND b.deleted_at IS NULL"
                + " ) ORDER BY name ASC";
        return jdbc.query(sql,
                new MapSqlParameterSource()
                        .addValue("instituteId", instituteId)
                        .addValue("facultyUserId", facultyUserId),
                COURSE_MAPPER);
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private Course insertCourse(Course c) {
        String sql = """
                INSERT INTO courses (uuid, institute_id, name, code, description, duration_weeks, fees, status,
                    created_at, updated_at, created_by, updated_by)
                VALUES (:uuid, :instituteId, :name, :code, :description, :durationWeeks, :fees, :status,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :createdBy, :updatedBy)
                """;
        var kh = new GeneratedKeyHolder();
        jdbc.update(sql, buildCourseParams(c), kh, new String[]{"id"});
        c.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return c;
    }

    private Course updateCourse(Course c) {
        String sql = """
                UPDATE courses SET
                    name = :name, description = :description,
                    duration_weeks = :durationWeeks, fees = :fees, status = :status,
                    updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                WHERE id = :id
                """;
        jdbc.update(sql, buildCourseParams(c).addValue("id", c.getId()));
        return c;
    }

    private static MapSqlParameterSource buildCourseParams(Course c) {
        Long actor = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("uuid",          c.getUuid())
                .addValue("instituteId",   c.getInstituteId())
                .addValue("name",          c.getName())
                .addValue("code",          c.getCode() != null ? c.getCode().toUpperCase() : null)
                .addValue("description",   c.getDescription())
                .addValue("durationWeeks", c.getDurationWeeks())
                .addValue("fees",          c.getFees())
                .addValue("status",        c.getStatus() == null ? CourseStatus.ACTIVE.name() : c.getStatus().name())
                .addValue("createdBy",     actor)
                .addValue("updatedBy",     actor);
    }

    private Batch insertBatch(Batch b) {
        String sql = """
                INSERT INTO batches (uuid, institute_id, course_id, name, batch_code,
                    mode, faculty_name, timing,
                    start_date, end_date, max_capacity, available_seats, status,
                    created_at, updated_at, created_by, updated_by)
                VALUES (:uuid, :instituteId, :courseId, :name, :batchCode,
                    :mode, :facultyName, :timing,
                    :startDate, :endDate, :maxCapacity, :maxCapacity, :status,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :createdBy, :updatedBy)
                """;
        var kh = new GeneratedKeyHolder();
        jdbc.update(sql, buildBatchParams(b), kh, new String[]{"id"});
        b.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return b;
    }

    private Batch updateBatch(Batch b) {
        String sql = """
                UPDATE batches SET
                    name = :name, batch_code = :batchCode,
                    mode = :mode, faculty_name = :facultyName,
                    timing = :timing,
                    start_date = :startDate, end_date = :endDate,
                    max_capacity = :maxCapacity, status = :status,
                    updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                WHERE id = :id
                """;
        jdbc.update(sql, buildBatchParams(b).addValue("id", b.getId()));
        return b;
    }

    private static MapSqlParameterSource buildBatchParams(Batch b) {
        Long actor = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("uuid",        b.getUuid())
                .addValue("instituteId", b.getInstituteId())
                .addValue("courseId",    b.getCourseId())
                .addValue("name",        b.getName())
                .addValue("batchCode",   b.getBatchCode())
                .addValue("mode",        b.getMode() != null ? b.getMode().toUpperCase() : "OFFLINE")
                .addValue("facultyName", b.getFacultyName())
                .addValue("timing",      b.getTiming())
                .addValue("startDate",   b.getStartDate() != null ? Date.valueOf(b.getStartDate()) : null)
                .addValue("endDate",     b.getEndDate() != null   ? Date.valueOf(b.getEndDate())   : null)
                .addValue("maxCapacity", b.getMaxCapacity())
                .addValue("status",      b.getStatus() == null ? BatchStatus.PLANNED.name() : b.getStatus().name())
                .addValue("createdBy",   actor)
                .addValue("updatedBy",   actor);
    }

    static Course mapCourse(ResultSet rs, int rn) throws SQLException {
        Course c = new Course();
        c.setId(rs.getLong("id"));
        c.setUuid(rs.getString("uuid"));
        c.setInstituteId(rs.getLong("institute_id"));
        c.setName(rs.getString("name"));
        c.setCode(rs.getString("code"));
        c.setDescription(rs.getString("description"));
        int dw = rs.getInt("duration_weeks");
        if (!rs.wasNull()) c.setDurationWeeks(dw);
        BigDecimal fees = rs.getBigDecimal("fees");
        c.setFees(fees != null ? fees : BigDecimal.ZERO);
        String status = rs.getString("status");
        if (status != null) c.setStatus(CourseStatus.valueOf(status));
        c.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        c.setUpdatedAt(toInstant(rs.getTimestamp("updated_at")));
        c.setDeletedAt(toInstant(rs.getTimestamp("deleted_at")));
        return c;
    }

    static Batch mapBatch(ResultSet rs, int rn) throws SQLException {
        Batch b = new Batch();
        b.setId(rs.getLong("id"));
        b.setUuid(rs.getString("uuid"));
        b.setInstituteId(rs.getLong("institute_id"));
        b.setCourseId(rs.getLong("course_id"));
        b.setName(rs.getString("name"));
        b.setBatchCode(rs.getString("batch_code"));
        b.setMode(rs.getString("mode"));
        b.setFacultyName(rs.getString("faculty_name"));
        b.setTiming(rs.getString("timing"));
        Date sd = rs.getDate("start_date");
        if (sd != null) b.setStartDate(sd.toLocalDate());
        Date ed = rs.getDate("end_date");
        if (ed != null) b.setEndDate(ed.toLocalDate());
        int cap = rs.getInt("max_capacity");
        if (!rs.wasNull()) b.setMaxCapacity(cap);
        String status = rs.getString("status");
        if (status != null) b.setStatus(BatchStatus.valueOf(status));
        b.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        b.setDeletedAt(toInstant(rs.getTimestamp("deleted_at")));
        // Joined fields
        b.setCourseName(rs.getString("course_name"));
        b.setCourseCode(rs.getString("course_code"));
        b.setEnrolledCount(rs.getInt("enrolled_count"));
        return b;
    }

    @Override
    public void deleteBatch(Long id) {
        jdbc.update("UPDATE batches SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id",
                new MapSqlParameterSource("id", id));
    }

    @Override
    public int countEnrolledByBatchId(Long batchId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM admissions WHERE batch_id = :batchId AND deleted_at IS NULL AND status NOT IN ('CANCELLED')",
                new MapSqlParameterSource("batchId", batchId), Long.class);
        return count == null ? 0 : count.intValue();
    }

    @Override
    public void recordBatchAssignment(Long instituteId, Long admissionId, Long fromBatchId, Long toBatchId,
                                      String action, String notes, Long actorId) {
        jdbc.update("""
                INSERT INTO batch_assignment_history
                    (institute_id, admission_id, from_batch_id, to_batch_id, action, notes, created_by)
                VALUES (:instituteId, :admissionId, :fromBatchId, :toBatchId, :action, :notes, :actorId)
                """,
                new MapSqlParameterSource()
                        .addValue("instituteId",  instituteId)
                        .addValue("admissionId",  admissionId)
                        .addValue("fromBatchId",  fromBatchId)
                        .addValue("toBatchId",    toBatchId)
                        .addValue("action",       action)
                        .addValue("notes",        notes)
                        .addValue("actorId",      actorId));
    }

    @Override
    public List<BatchAssignmentHistoryRow> findBatchAssignmentHistory(Long admissionId, Long instituteId) {
        return jdbc.query("""
                SELECT h.id, h.admission_id,
                       h.from_batch_id, fb.name AS from_batch_name,
                       h.to_batch_id,   tb.name AS to_batch_name,
                       h.action, h.notes, h.created_at,
                       CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS created_by_name
                FROM batch_assignment_history h
                LEFT JOIN batches fb ON fb.id = h.from_batch_id
                LEFT JOIN batches tb ON tb.id = h.to_batch_id
                LEFT JOIN users  u  ON u.id  = h.created_by
                WHERE h.admission_id = :admissionId AND h.institute_id = :instituteId
                ORDER BY h.created_at DESC
                """,
                new MapSqlParameterSource()
                        .addValue("admissionId", admissionId)
                        .addValue("instituteId", instituteId),
                (rs, rn) -> new BatchAssignmentHistoryRow(
                        rs.getLong("id"),
                        rs.getLong("admission_id"),
                        rs.getObject("from_batch_id", Long.class),
                        rs.getString("from_batch_name"),
                        rs.getObject("to_batch_id", Long.class),
                        rs.getString("to_batch_name"),
                        rs.getString("action"),
                        rs.getString("notes"),
                        toInstant(rs.getTimestamp("created_at")),
                        rs.getString("created_by_name")
                ));
    }

    private static Instant toInstant(Timestamp ts) { return ts == null ? null : ts.toInstant(); }
}
