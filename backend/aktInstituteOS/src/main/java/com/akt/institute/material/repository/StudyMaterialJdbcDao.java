package com.akt.institute.material.repository;

import com.akt.institute.material.domain.StudyMaterial;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class StudyMaterialJdbcDao implements StudyMaterialDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String BASE = """
            SELECT sm.id, sm.uuid, sm.institute_id,
                   sm.course_id, c.name course_name,
                   sm.batch_id,  b.name batch_name,
                   sm.subject, sm.uploaded_by,
                   CONCAT(u.first_name,' ',COALESCE(u.last_name,'')) uploader_name,
                   sm.title, sm.description, sm.material_type,
                   sm.file_url, sm.file_name, sm.file_size_bytes,
                   sm.external_link, sm.is_active, sm.created_at, sm.updated_at
            FROM study_materials sm
            LEFT JOIN courses c ON c.id = sm.course_id
            LEFT JOIN batches b ON b.id = sm.batch_id
            LEFT JOIN users   u ON u.id = sm.uploaded_by
            WHERE sm.deleted_at IS NULL
            """;

    @Override
    public List<StudyMaterial> findAll(Long instituteId, Long batchId, Long courseId, String type) {
        var sql = new StringBuilder(BASE + " AND sm.institute_id=:iid AND sm.is_active=TRUE");
        var p   = new MapSqlParameterSource("iid", instituteId);
        if (batchId  != null) { sql.append(" AND sm.batch_id=:bid");  p.addValue("bid", batchId); }
        if (courseId != null) { sql.append(" AND sm.course_id=:cid"); p.addValue("cid", courseId); }
        if (type     != null) { sql.append(" AND sm.material_type=:type"); p.addValue("type", type.toUpperCase()); }
        sql.append(" ORDER BY sm.created_at DESC");
        return jdbc.query(sql.toString(), p, (rs, row) -> map(rs));
    }

    @Override
    public Optional<StudyMaterial> findById(Long id, Long instituteId) {
        var rows = jdbc.query(BASE + " AND sm.id=:id AND sm.institute_id=:iid",
                Map.of("id", id, "iid", instituteId), (rs, row) -> map(rs));
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public StudyMaterial save(StudyMaterial m) {
        var kh = new GeneratedKeyHolder();
        jdbc.update("""
                INSERT INTO study_materials
                    (institute_id,course_id,batch_id,subject,uploaded_by,title,description,
                     material_type,file_url,file_name,file_size_bytes,external_link,is_active,
                     created_by,updated_by)
                VALUES
                    (:iid,:cid,:bid,:sub,:ub,:title,:desc,:mtype,:fu,:fn,:fsz,:el,:ia,:cb,:uby)
                """,
                new MapSqlParameterSource()
                        .addValue("iid",   m.getInstituteId())
                        .addValue("cid",   m.getCourseId())
                        .addValue("bid",   m.getBatchId())
                        .addValue("sub",   m.getSubject())
                        .addValue("ub",    m.getUploadedBy())
                        .addValue("title", m.getTitle())
                        .addValue("desc",  m.getDescription())
                        .addValue("mtype", m.getMaterialType())
                        .addValue("fu",    m.getFileUrl())
                        .addValue("fn",    m.getFileName())
                        .addValue("fsz",   m.getFileSizeBytes())
                        .addValue("el",    m.getExternalLink())
                        .addValue("ia",    true)
                        .addValue("cb",    m.getCreatedBy())
                        .addValue("uby",   m.getUpdatedBy()),
                kh, new String[]{"id"});
        m.setId(((Number) kh.getKeys().get("id")).longValue());
        return findById(m.getId(), m.getInstituteId()).orElse(m);
    }

    @Override
    public void softDelete(Long id, Long instituteId, Long actorId) {
        jdbc.update("UPDATE study_materials SET deleted_at=CURRENT_TIMESTAMP, updated_by=:ub WHERE id=:id AND institute_id=:iid",
                Map.of("id", id, "iid", instituteId, "ub", actorId));
    }

    private static StudyMaterial map(ResultSet rs) throws SQLException {
        StudyMaterial m = new StudyMaterial();
        m.setId(rs.getLong("id"));
        m.setUuid(rs.getString("uuid"));
        m.setInstituteId(rs.getLong("institute_id"));
        long cid = rs.getLong("course_id"); if (!rs.wasNull()) m.setCourseId(cid);
        m.setCourseName(rs.getString("course_name"));
        long bid = rs.getLong("batch_id"); if (!rs.wasNull()) m.setBatchId(bid);
        m.setBatchName(rs.getString("batch_name"));
        m.setSubject(rs.getString("subject"));
        m.setUploadedBy(rs.getLong("uploaded_by"));
        m.setUploaderName(rs.getString("uploader_name"));
        m.setTitle(rs.getString("title"));
        m.setDescription(rs.getString("description"));
        m.setMaterialType(rs.getString("material_type"));
        m.setFileUrl(rs.getString("file_url"));
        m.setFileName(rs.getString("file_name"));
        long fsz = rs.getLong("file_size_bytes"); if (!rs.wasNull()) m.setFileSizeBytes(fsz);
        m.setExternalLink(rs.getString("external_link"));
        m.setActive(rs.getBoolean("is_active"));
        Timestamp ca = rs.getTimestamp("created_at"); if (ca != null) m.setCreatedAt(ca.toInstant());
        Timestamp ua = rs.getTimestamp("updated_at"); if (ua != null) m.setUpdatedAt(ua.toInstant());
        return m;
    }
}
