package com.akt.institute.student.repository;

import com.akt.institute.shared.util.AuditUtil;
import com.akt.institute.student.domain.Student;
import com.akt.institute.student.domain.StudentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class StudentJdbcDao implements StudentDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_ALL_COLS = """
            id, uuid, institute_id, student_number, first_name, last_name, email, phone,
            whatsapp_number, date_of_birth, gender, address, city, state, pincode, photo_url,
            parent_name, parent_phone, parent_email, emergency_contact,
            highest_qualification, school_college_name, aadhaar_number, pan_number,
            status, lead_id, notes,
            created_at, updated_at, created_by, updated_by, deleted_at
            """;

    static final RowMapper<Student> STUDENT_ROW_MAPPER = StudentJdbcDao::mapRow;

    @Override
    public Student save(Student student) {
        if (student.getId() == null) {
            return insert(student);
        }
        return update(student);
    }

    @Override
    public Optional<Student> findByIdAndInstituteId(Long id, Long instituteId) {
        String sql = "SELECT " + SELECT_ALL_COLS
                + " FROM students WHERE id = :id AND institute_id = :instituteId AND deleted_at IS NULL";
        var params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("instituteId", instituteId);
        List<Student> results = jdbc.query(sql, params, STUDENT_ROW_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public Optional<Student> findByStudentNumberAndInstituteId(String studentNumber, Long instituteId) {
        String sql = "SELECT " + SELECT_ALL_COLS
                + " FROM students WHERE student_number = :studentNumber AND institute_id = :instituteId AND deleted_at IS NULL";
        var params = new MapSqlParameterSource()
                .addValue("studentNumber", studentNumber)
                .addValue("instituteId", instituteId);
        List<Student> results = jdbc.query(sql, params, STUDENT_ROW_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public boolean existsByPhoneAndInstituteId(String phone, Long instituteId) {
        String sql = "SELECT COUNT(1) FROM students WHERE phone = :phone AND institute_id = :instituteId AND deleted_at IS NULL";
        Long count = jdbc.queryForObject(sql,
                new MapSqlParameterSource().addValue("phone", phone).addValue("instituteId", instituteId),
                Long.class);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmailAndInstituteId(String email, Long instituteId) {
        String sql = "SELECT COUNT(1) FROM students WHERE email = :email AND institute_id = :instituteId AND deleted_at IS NULL";
        Long count = jdbc.queryForObject(sql,
                new MapSqlParameterSource().addValue("email", email).addValue("instituteId", instituteId),
                Long.class);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByPhoneAndInstituteIdAndIdNot(String phone, Long instituteId, Long excludeId) {
        String sql = "SELECT COUNT(1) FROM students WHERE phone = :phone AND institute_id = :instituteId AND id <> :excludeId AND deleted_at IS NULL";
        Long count = jdbc.queryForObject(sql,
                new MapSqlParameterSource().addValue("phone", phone).addValue("instituteId", instituteId).addValue("excludeId", excludeId),
                Long.class);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmailAndInstituteIdAndIdNot(String email, Long instituteId, Long excludeId) {
        String sql = "SELECT COUNT(1) FROM students WHERE email = :email AND institute_id = :instituteId AND id <> :excludeId AND deleted_at IS NULL";
        Long count = jdbc.queryForObject(sql,
                new MapSqlParameterSource().addValue("email", email).addValue("instituteId", instituteId).addValue("excludeId", excludeId),
                Long.class);
        return count != null && count > 0;
    }

    @Override
    public List<Student> findWithFilters(Long instituteId, String status, String q,
                                          int page, int size, String sortField, String sortDir) {
        var sql = new StringBuilder("SELECT " + SELECT_ALL_COLS + " FROM students WHERE deleted_at IS NULL AND institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, status, q);
        String col = sanitizeSortField(sortField);
        String dir = "desc".equalsIgnoreCase(sortDir) ? "DESC" : "ASC";
        sql.append(" ORDER BY ").append(col).append(" ").append(dir);
        sql.append(" LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, STUDENT_ROW_MAPPER);
    }

    @Override
    public long countWithFilters(Long instituteId, String status, String q) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM students WHERE deleted_at IS NULL AND institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, status, q);
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public List<Student> findAllByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return new ArrayList<>();
        String sql = "SELECT " + SELECT_ALL_COLS + " FROM students WHERE id IN (:ids) AND deleted_at IS NULL";
        return jdbc.query(sql, new MapSqlParameterSource("ids", ids), STUDENT_ROW_MAPPER);
    }

    @Override
    public List<Student> findAllByInstituteIdForReindex(Long instituteId) {
        String sql = "SELECT " + SELECT_ALL_COLS
                + " FROM students WHERE institute_id = :instituteId AND deleted_at IS NULL ORDER BY created_at DESC";
        return jdbc.query(sql, new MapSqlParameterSource("instituteId", instituteId), STUDENT_ROW_MAPPER);
    }

    @Override
    public long countByInstituteIdAndStatus(Long instituteId, StudentStatus status) {
        String sql = "SELECT COUNT(1) FROM students WHERE institute_id = :instituteId AND status = :status AND deleted_at IS NULL";
        Long count = jdbc.queryForObject(sql,
                new MapSqlParameterSource().addValue("instituteId", instituteId).addValue("status", status.name()),
                Long.class);
        return count == null ? 0L : count;
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private static void applyFilters(StringBuilder sql, MapSqlParameterSource params, String status, String q) {
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = :status");
            params.addValue("status", status);
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.toLowerCase().trim() + "%";
            String rawPattern = "%" + q.trim() + "%";
            sql.append("""
                     AND (LOWER(first_name) LIKE :q
                          OR LOWER(COALESCE(last_name, '')) LIKE :q
                          OR phone LIKE :qRaw
                          OR LOWER(COALESCE(email, '')) LIKE :q
                          OR student_number LIKE :qRaw)
                    """);
            params.addValue("q", pattern).addValue("qRaw", rawPattern);
        }
    }

    private static String sanitizeSortField(String field) {
        return switch (field == null ? "created_at" : field) {
            case "firstName", "first_name"      -> "first_name";
            case "lastName",  "last_name"        -> "last_name";
            case "studentNumber", "student_number" -> "student_number";
            case "phone"   -> "phone";
            case "status"  -> "status";
            default        -> "created_at";
        };
    }

    private Student insert(Student student) {
        String sql = """
                INSERT INTO students (
                    uuid, institute_id, student_number, first_name, last_name, email, phone,
                    whatsapp_number, date_of_birth, gender, address, city, state, pincode, photo_url,
                    parent_name, parent_phone, parent_email, emergency_contact,
                    highest_qualification, school_college_name, aadhaar_number, pan_number,
                    status, lead_id, notes,
                    created_at, updated_at, created_by, updated_by)
                VALUES (
                    :uuid, :instituteId, :studentNumber, :firstName, :lastName, :email, :phone,
                    :whatsappNumber, :dateOfBirth, :gender, :address, :city, :state, :pincode, :photoUrl,
                    :parentName, :parentPhone, :parentEmail, :emergencyContact,
                    :highestQualification, :schoolCollegeName, :aadhaarNumber, :panNumber,
                    :status, :leadId, :notes,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :createdBy, :updatedBy)
                """;
        var params = buildParams(student);
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(sql, params, keyHolder, new String[]{"id"});
        student.setId(Objects.requireNonNull(keyHolder.getKeyAs(Long.class)));
        return student;
    }

    private Student update(Student student) {
        String sql = """
                UPDATE students SET
                    first_name = :firstName, last_name = :lastName, email = :email, phone = :phone,
                    whatsapp_number = :whatsappNumber, date_of_birth = :dateOfBirth, gender = :gender,
                    address = :address, city = :city, state = :state, pincode = :pincode,
                    photo_url = :photoUrl, parent_name = :parentName, parent_phone = :parentPhone,
                    parent_email = :parentEmail, emergency_contact = :emergencyContact,
                    highest_qualification = :highestQualification, school_college_name = :schoolCollegeName,
                    aadhaar_number = :aadhaarNumber, pan_number = :panNumber,
                    status = :status, lead_id = :leadId, notes = :notes,
                    deleted_at = :deletedAt, updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                WHERE id = :id
                """;
        var params = buildParams(student)
                .addValue("id", student.getId())
                .addValue("deletedAt", toTimestamp(student.getDeletedAt()));
        jdbc.update(sql, params);
        return student;
    }

    private static MapSqlParameterSource buildParams(Student s) {
        Long currentUserId = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("uuid", s.getUuid())
                .addValue("instituteId", s.getInstituteId())
                .addValue("studentNumber", s.getStudentNumber())
                .addValue("firstName", s.getFirstName())
                .addValue("lastName", s.getLastName())
                .addValue("email", s.getEmail())
                .addValue("phone", s.getPhone())
                .addValue("whatsappNumber", s.getWhatsappNumber())
                .addValue("dateOfBirth", s.getDateOfBirth() == null ? null : Date.valueOf(s.getDateOfBirth()))
                .addValue("gender", s.getGender())
                .addValue("address", s.getAddress())
                .addValue("city", s.getCity())
                .addValue("state", s.getState())
                .addValue("pincode", s.getPincode())
                .addValue("photoUrl", s.getPhotoUrl())
                .addValue("parentName", s.getParentName())
                .addValue("parentPhone", s.getParentPhone())
                .addValue("parentEmail", s.getParentEmail())
                .addValue("emergencyContact", s.getEmergencyContact())
                .addValue("highestQualification", s.getHighestQualification())
                .addValue("schoolCollegeName", s.getSchoolCollegeName())
                .addValue("aadhaarNumber", s.getAadhaarNumber())
                .addValue("panNumber", s.getPanNumber())
                .addValue("status", s.getStatus() == null ? StudentStatus.ACTIVE.name() : s.getStatus().name())
                .addValue("leadId", s.getLeadId())
                .addValue("notes", s.getNotes())
                .addValue("createdBy", currentUserId)
                .addValue("updatedBy", currentUserId);
    }

    static Student mapRow(ResultSet rs, int rowNum) throws SQLException {
        Student s = new Student();
        s.setId(rs.getLong("id"));
        s.setUuid(rs.getString("uuid"));
        s.setInstituteId(rs.getLong("institute_id"));
        s.setStudentNumber(rs.getString("student_number"));
        s.setFirstName(rs.getString("first_name"));
        s.setLastName(rs.getString("last_name"));
        s.setEmail(rs.getString("email"));
        s.setPhone(rs.getString("phone"));
        s.setWhatsappNumber(rs.getString("whatsapp_number"));
        Date dob = rs.getDate("date_of_birth");
        if (dob != null) s.setDateOfBirth(dob.toLocalDate());
        s.setGender(rs.getString("gender"));
        s.setAddress(rs.getString("address"));
        s.setCity(rs.getString("city"));
        s.setState(rs.getString("state"));
        s.setPincode(rs.getString("pincode"));
        s.setPhotoUrl(rs.getString("photo_url"));
        s.setParentName(rs.getString("parent_name"));
        s.setParentPhone(rs.getString("parent_phone"));
        s.setParentEmail(rs.getString("parent_email"));
        s.setEmergencyContact(rs.getString("emergency_contact"));
        s.setHighestQualification(rs.getString("highest_qualification"));
        s.setSchoolCollegeName(rs.getString("school_college_name"));
        s.setAadhaarNumber(rs.getString("aadhaar_number"));
        s.setPanNumber(rs.getString("pan_number"));
        String status = rs.getString("status");
        if (status != null) s.setStatus(StudentStatus.valueOf(status));
        long leadId = rs.getLong("lead_id");
        if (!rs.wasNull()) s.setLeadId(leadId);
        s.setNotes(rs.getString("notes"));
        s.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        s.setUpdatedAt(toInstant(rs.getTimestamp("updated_at")));
        s.setDeletedAt(toInstant(rs.getTimestamp("deleted_at")));
        long createdBy = rs.getLong("created_by");
        if (!rs.wasNull()) s.setCreatedBy(createdBy);
        long updatedBy = rs.getLong("updated_by");
        if (!rs.wasNull()) s.setUpdatedBy(updatedBy);
        return s;
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    private static Timestamp toTimestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
