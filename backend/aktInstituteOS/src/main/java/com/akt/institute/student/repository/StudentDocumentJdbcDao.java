package com.akt.institute.student.repository;

import com.akt.institute.shared.util.AuditUtil;
import com.akt.institute.student.domain.StudentDocument;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class StudentDocumentJdbcDao implements StudentDocumentDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_ALL_COLS = """
            id, student_id, admission_id, document_type, file_name, file_url,
            file_size_bytes, mime_type, is_verified, verified_by, verified_at,
            created_at, updated_at, created_by, updated_by, deleted_at
            """;

    private static final RowMapper<StudentDocument> DOC_ROW_MAPPER = StudentDocumentJdbcDao::mapRow;

    @Override
    public StudentDocument save(StudentDocument doc) {
        if (doc.getId() == null) {
            return insert(doc);
        }
        return update(doc);
    }

    @Override
    public List<StudentDocument> findAllByStudentId(Long studentId) {
        String sql = "SELECT " + SELECT_ALL_COLS
                + " FROM student_documents WHERE student_id = :studentId AND deleted_at IS NULL ORDER BY created_at";
        return jdbc.query(sql, new MapSqlParameterSource("studentId", studentId), DOC_ROW_MAPPER);
    }

    @Override
    public Optional<StudentDocument> findByIdAndStudentId(Long id, Long studentId) {
        String sql = "SELECT " + SELECT_ALL_COLS
                + " FROM student_documents WHERE id = :id AND student_id = :studentId AND deleted_at IS NULL";
        var params = new MapSqlParameterSource().addValue("id", id).addValue("studentId", studentId);
        List<StudentDocument> results = jdbc.query(sql, params, DOC_ROW_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private StudentDocument insert(StudentDocument doc) {
        String sql = """
                INSERT INTO student_documents (
                    student_id, admission_id, document_type, file_name, file_url,
                    file_size_bytes, mime_type, is_verified, verified_by, verified_at,
                    created_at, updated_at, created_by, updated_by)
                VALUES (
                    :studentId, :admissionId, :documentType, :fileName, :fileUrl,
                    :fileSizeBytes, :mimeType, :isVerified, :verifiedBy, :verifiedAt,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :createdBy, :updatedBy)
                """;
        var params = buildParams(doc);
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(sql, params, keyHolder, new String[]{"id"});
        doc.setId(Objects.requireNonNull(keyHolder.getKeyAs(Long.class)));
        return doc;
    }

    private StudentDocument update(StudentDocument doc) {
        String sql = """
                UPDATE student_documents SET
                    document_type = :documentType, file_name = :fileName, file_url = :fileUrl,
                    file_size_bytes = :fileSizeBytes, mime_type = :mimeType,
                    is_verified = :isVerified, verified_by = :verifiedBy, verified_at = :verifiedAt,
                    deleted_at = :deletedAt, updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                WHERE id = :id
                """;
        Long currentUserId = AuditUtil.getCurrentUserId();
        var params = buildParams(doc)
                .addValue("id", doc.getId())
                .addValue("deletedAt", toTimestamp(doc.getDeletedAt()))
                .addValue("updatedBy", currentUserId);
        jdbc.update(sql, params);
        return doc;
    }

    private static MapSqlParameterSource buildParams(StudentDocument doc) {
        Long currentUserId = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("studentId", doc.getStudentId())
                .addValue("admissionId", doc.getAdmissionId())
                .addValue("documentType", doc.getDocumentType())
                .addValue("fileName", doc.getFileName())
                .addValue("fileUrl", doc.getFileUrl())
                .addValue("fileSizeBytes", doc.getFileSizeBytes())
                .addValue("mimeType", doc.getMimeType())
                .addValue("isVerified", doc.isVerified())
                .addValue("verifiedBy", doc.getVerifiedBy())
                .addValue("verifiedAt", toTimestamp(doc.getVerifiedAt()))
                .addValue("createdBy", currentUserId)
                .addValue("updatedBy", currentUserId);
    }

    private static StudentDocument mapRow(ResultSet rs, int rowNum) throws SQLException {
        StudentDocument doc = new StudentDocument();
        doc.setId(rs.getLong("id"));
        doc.setStudentId(rs.getLong("student_id"));
        long admissionId = rs.getLong("admission_id");
        if (!rs.wasNull()) doc.setAdmissionId(admissionId);
        doc.setDocumentType(rs.getString("document_type"));
        doc.setFileName(rs.getString("file_name"));
        doc.setFileUrl(rs.getString("file_url"));
        long fileSize = rs.getLong("file_size_bytes");
        if (!rs.wasNull()) doc.setFileSizeBytes(fileSize);
        doc.setMimeType(rs.getString("mime_type"));
        doc.setVerified(rs.getBoolean("is_verified"));
        long verifiedBy = rs.getLong("verified_by");
        if (!rs.wasNull()) doc.setVerifiedBy(verifiedBy);
        Timestamp verifiedAt = rs.getTimestamp("verified_at");
        if (verifiedAt != null) doc.setVerifiedAt(verifiedAt.toInstant());
        doc.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        doc.setUpdatedAt(toInstant(rs.getTimestamp("updated_at")));
        doc.setDeletedAt(toInstant(rs.getTimestamp("deleted_at")));
        long createdBy = rs.getLong("created_by");
        if (!rs.wasNull()) doc.setCreatedBy(createdBy);
        long updatedBy = rs.getLong("updated_by");
        if (!rs.wasNull()) doc.setUpdatedBy(updatedBy);
        return doc;
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    private static Timestamp toTimestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
