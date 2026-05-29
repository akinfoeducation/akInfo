package com.akt.institute.lead.repository;

import com.akt.institute.lead.domain.Lead;
import com.akt.institute.lead.domain.LeadSource;
import com.akt.institute.lead.domain.LeadStatus;
import com.akt.institute.shared.util.AuditUtil;
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
public class LeadJdbcDao implements LeadDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String SELECT_COLS = """
            id, uuid, institute_id, first_name, last_name, phone, whatsapp_number, email,
            course_interested, source, status, assigned_to_id, notes,
            next_follow_up_at, last_contacted_at, converted_at,
            created_at, updated_at, created_by, updated_by, deleted_at
            """;

    static final RowMapper<Lead> ROW_MAPPER = LeadJdbcDao::mapRow;

    @Override
    public Lead save(Lead lead) {
        return lead.getId() == null ? insert(lead) : update(lead);
    }

    @Override
    public Optional<Lead> findByIdAndInstituteId(Long id, Long instituteId) {
        String sql = "SELECT " + SELECT_COLS
                + " FROM leads WHERE id = :id AND institute_id = :instituteId AND deleted_at IS NULL";
        List<Lead> results = jdbc.query(sql,
                new MapSqlParameterSource().addValue("id", id).addValue("instituteId", instituteId),
                ROW_MAPPER);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    @Override
    public boolean existsByPhoneAndInstituteId(String phone, Long instituteId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM leads WHERE phone = :phone AND institute_id = :instituteId AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("phone", phone).addValue("instituteId", instituteId),
                Long.class);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByPhoneAndInstituteIdAndIdNot(String phone, Long instituteId, Long excludeId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM leads WHERE phone = :phone AND institute_id = :instituteId AND id <> :excludeId AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("phone", phone).addValue("instituteId", instituteId).addValue("excludeId", excludeId),
                Long.class);
        return count != null && count > 0;
    }

    @Override
    public List<Lead> findWithFilters(Long instituteId, String status, String source, String q,
                                      int page, int size, String sortField, String sortDir) {
        var sql = new StringBuilder("SELECT " + SELECT_COLS + " FROM leads WHERE deleted_at IS NULL AND institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, status, source, q);
        String col = sanitizeSortField(sortField);
        String dir = "desc".equalsIgnoreCase(sortDir) ? "DESC" : "ASC";
        sql.append(" ORDER BY ").append(col).append(" ").append(dir);
        sql.append(" LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, ROW_MAPPER);
    }

    @Override
    public long countWithFilters(Long instituteId, String status, String source, String q) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM leads WHERE deleted_at IS NULL AND institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, status, source, q);
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public List<Lead> findOverdueFollowups(Long instituteId, Instant before) {
        String sql = "SELECT " + SELECT_COLS
                + " FROM leads WHERE institute_id = :instituteId AND deleted_at IS NULL"
                + " AND next_follow_up_at < :before AND status NOT IN ('CONVERTED', 'LOST')"
                + " ORDER BY next_follow_up_at ASC";
        return jdbc.query(sql,
                new MapSqlParameterSource().addValue("instituteId", instituteId).addValue("before", Timestamp.from(before)),
                ROW_MAPPER);
    }

    @Override
    public long countByInstituteIdAndStatus(Long instituteId, LeadStatus status) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM leads WHERE institute_id = :instituteId AND status = :status AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("instituteId", instituteId).addValue("status", status.name()),
                Long.class);
        return count == null ? 0L : count;
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private static void applyFilters(StringBuilder sql, MapSqlParameterSource params,
                                     String status, String source, String q) {
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = :status");
            params.addValue("status", status);
        }
        if (source != null && !source.isBlank()) {
            sql.append(" AND source = :source");
            params.addValue("source", source);
        }
        if (q != null && !q.isBlank()) {
            String pattern   = "%" + q.toLowerCase().trim() + "%";
            String rawPattern = "%" + q.trim() + "%";
            sql.append("""
                     AND (LOWER(first_name) LIKE :q
                          OR LOWER(COALESCE(last_name, '')) LIKE :q
                          OR phone LIKE :qRaw
                          OR LOWER(COALESCE(email, '')) LIKE :q
                          OR LOWER(COALESCE(course_interested, '')) LIKE :q)
                    """);
            params.addValue("q", pattern).addValue("qRaw", rawPattern);
        }
    }

    private static String sanitizeSortField(String field) {
        return switch (field == null ? "created_at" : field) {
            case "firstName",  "first_name"        -> "first_name";
            case "lastName",   "last_name"          -> "last_name";
            case "phone"                            -> "phone";
            case "status"                           -> "status";
            case "source"                           -> "source";
            case "nextFollowUpAt", "next_follow_up_at" -> "next_follow_up_at";
            default                                 -> "created_at";
        };
    }

    private Lead insert(Lead lead) {
        String sql = """
                INSERT INTO leads (
                    uuid, institute_id, first_name, last_name, phone, whatsapp_number, email,
                    course_interested, source, status, assigned_to_id, notes,
                    next_follow_up_at, last_contacted_at, converted_at,
                    created_at, updated_at, created_by, updated_by)
                VALUES (
                    :uuid, :instituteId, :firstName, :lastName, :phone, :whatsappNumber, :email,
                    :courseInterested, :source, :status, :assignedToId, :notes,
                    :nextFollowUpAt, :lastContactedAt, :convertedAt,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :createdBy, :updatedBy)
                """;
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(sql, buildParams(lead), keyHolder, new String[]{"id"});
        lead.setId(Objects.requireNonNull(keyHolder.getKeyAs(Long.class)));
        return lead;
    }

    private Lead update(Lead lead) {
        String sql = """
                UPDATE leads SET
                    first_name = :firstName, last_name = :lastName,
                    phone = :phone, whatsapp_number = :whatsappNumber, email = :email,
                    course_interested = :courseInterested, source = :source, status = :status,
                    assigned_to_id = :assignedToId, notes = :notes,
                    next_follow_up_at = :nextFollowUpAt, last_contacted_at = :lastContactedAt,
                    converted_at = :convertedAt, deleted_at = :deletedAt,
                    updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                WHERE id = :id
                """;
        jdbc.update(sql, buildParams(lead).addValue("id", lead.getId()).addValue("deletedAt", toTs(lead.getDeletedAt())));
        return lead;
    }

    private static MapSqlParameterSource buildParams(Lead l) {
        Long actor = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("uuid",             l.getUuid())
                .addValue("instituteId",      l.getInstituteId())
                .addValue("firstName",        l.getFirstName())
                .addValue("lastName",         l.getLastName())
                .addValue("phone",            l.getPhone())
                .addValue("whatsappNumber",   l.getWhatsappNumber())
                .addValue("email",            l.getEmail())
                .addValue("courseInterested", l.getCourseInterested())
                .addValue("source",           l.getSource() == null ? LeadSource.WALK_IN.name() : l.getSource().name())
                .addValue("status",           l.getStatus() == null ? LeadStatus.NEW.name()     : l.getStatus().name())
                .addValue("assignedToId",     l.getAssignedToId())
                .addValue("notes",            l.getNotes())
                .addValue("nextFollowUpAt",   toTs(l.getNextFollowUpAt()))
                .addValue("lastContactedAt",  toTs(l.getLastContactedAt()))
                .addValue("convertedAt",      toTs(l.getConvertedAt()))
                .addValue("createdBy",        actor)
                .addValue("updatedBy",        actor);
    }

    static Lead mapRow(ResultSet rs, int rowNum) throws SQLException {
        Lead l = new Lead();
        l.setId(rs.getLong("id"));
        l.setUuid(rs.getString("uuid"));
        l.setInstituteId(rs.getLong("institute_id"));
        l.setFirstName(rs.getString("first_name"));
        l.setLastName(rs.getString("last_name"));
        l.setPhone(rs.getString("phone"));
        l.setWhatsappNumber(rs.getString("whatsapp_number"));
        l.setEmail(rs.getString("email"));
        l.setCourseInterested(rs.getString("course_interested"));
        String src = rs.getString("source");
        if (src != null) l.setSource(LeadSource.valueOf(src));
        String status = rs.getString("status");
        if (status != null) l.setStatus(LeadStatus.valueOf(status));
        long assignedTo = rs.getLong("assigned_to_id");
        if (!rs.wasNull()) l.setAssignedToId(assignedTo);
        l.setNotes(rs.getString("notes"));
        l.setNextFollowUpAt(toInstant(rs.getTimestamp("next_follow_up_at")));
        l.setLastContactedAt(toInstant(rs.getTimestamp("last_contacted_at")));
        l.setConvertedAt(toInstant(rs.getTimestamp("converted_at")));
        l.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        l.setUpdatedAt(toInstant(rs.getTimestamp("updated_at")));
        l.setDeletedAt(toInstant(rs.getTimestamp("deleted_at")));
        long createdBy = rs.getLong("created_by");
        if (!rs.wasNull()) l.setCreatedBy(createdBy);
        long updatedBy = rs.getLong("updated_by");
        if (!rs.wasNull()) l.setUpdatedBy(updatedBy);
        return l;
    }

    private static Instant toInstant(Timestamp ts) { return ts == null ? null : ts.toInstant(); }
    private static Timestamp toTs(Instant i)        { return i  == null ? null : Timestamp.from(i); }
}
