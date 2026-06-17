package com.akt.institute.lead.followup.repository;

import com.akt.institute.lead.followup.domain.FollowUp;
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
public class FollowUpJdbcDao implements FollowUpDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String COLS = """
            id, institute_id, lead_id, scheduled_at, remarks, is_done, completed_at,
            created_by, updated_by, created_at, updated_at
            """;

    private static final RowMapper<FollowUp> ROW_MAPPER = FollowUpJdbcDao::mapRow;

    @Override
    public FollowUp save(FollowUp f) {
        return f.getId() == null ? insert(f) : update(f);
    }

    @Override
    public Optional<FollowUp> findByIdAndInstituteId(Long id, Long instituteId) {
        List<FollowUp> rows = jdbc.query(
            "SELECT " + COLS + " FROM follow_ups WHERE id = :id AND institute_id = :iid",
            new MapSqlParameterSource().addValue("id", id).addValue("iid", instituteId),
            ROW_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public List<FollowUp> findByLeadId(Long leadId, Long instituteId) {
        return jdbc.query(
            "SELECT " + COLS + " FROM follow_ups WHERE lead_id = :leadId AND institute_id = :iid ORDER BY scheduled_at ASC",
            new MapSqlParameterSource().addValue("leadId", leadId).addValue("iid", instituteId),
            ROW_MAPPER);
    }

    @Override
    public List<FollowUp> findPendingByCreatedBy(Long createdBy, Long instituteId) {
        return jdbc.query(
            "SELECT " + COLS + " FROM follow_ups WHERE created_by = :cb AND institute_id = :iid AND is_done = FALSE ORDER BY scheduled_at ASC",
            new MapSqlParameterSource().addValue("cb", createdBy).addValue("iid", instituteId),
            ROW_MAPPER);
    }

    @Override
    public List<FollowUp> findTodayByCreatedBy(Long createdBy, Long instituteId, Instant from, Instant to) {
        return jdbc.query(
            "SELECT " + COLS + " FROM follow_ups WHERE created_by = :cb AND institute_id = :iid AND scheduled_at BETWEEN :from AND :to ORDER BY scheduled_at ASC",
            new MapSqlParameterSource().addValue("cb", createdBy).addValue("iid", instituteId)
                .addValue("from", Timestamp.from(from)).addValue("to", Timestamp.from(to)),
            ROW_MAPPER);
    }

    @Override
    public long countPendingByCreatedBy(Long createdBy, Long instituteId) {
        Long count = jdbc.queryForObject(
            "SELECT COUNT(1) FROM follow_ups WHERE created_by = :cb AND institute_id = :iid AND is_done = FALSE",
            new MapSqlParameterSource().addValue("cb", createdBy).addValue("iid", instituteId),
            Long.class);
        return count == null ? 0 : count;
    }

    private FollowUp insert(FollowUp f) {
        Long actor = AuditUtil.getCurrentUserId();
        String sql = """
                INSERT INTO follow_ups (institute_id, lead_id, scheduled_at, remarks, is_done, completed_at, created_by, updated_by)
                VALUES (:iid, :leadId, :scheduledAt, :remarks, :done, :completedAt, :actor, :actor)
                """;
        var params = new MapSqlParameterSource()
            .addValue("iid", f.getInstituteId())
            .addValue("leadId", f.getLeadId())
            .addValue("scheduledAt", toTs(f.getScheduledAt()))
            .addValue("remarks", f.getRemarks())
            .addValue("done", f.isDone())
            .addValue("completedAt", toTs(f.getCompletedAt()))
            .addValue("actor", actor);
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(sql, params, keyHolder, new String[]{"id"});
        f.setId(Objects.requireNonNull(keyHolder.getKeyAs(Long.class)));
        f.setCreatedBy(actor);
        return f;
    }

    private FollowUp update(FollowUp f) {
        Long actor = AuditUtil.getCurrentUserId();
        jdbc.update(
            "UPDATE follow_ups SET remarks = :remarks, is_done = :done, completed_at = :completedAt, updated_by = :actor, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
            new MapSqlParameterSource()
                .addValue("remarks", f.getRemarks())
                .addValue("done", f.isDone())
                .addValue("completedAt", toTs(f.getCompletedAt()))
                .addValue("actor", actor)
                .addValue("id", f.getId())
        );
        return f;
    }

    static FollowUp mapRow(ResultSet rs, int n) throws SQLException {
        FollowUp f = new FollowUp();
        f.setId(rs.getLong("id"));
        f.setInstituteId(rs.getLong("institute_id"));
        f.setLeadId(rs.getLong("lead_id"));
        f.setScheduledAt(toInstant(rs.getTimestamp("scheduled_at")));
        f.setRemarks(rs.getString("remarks"));
        f.setDone(rs.getBoolean("is_done"));
        f.setCompletedAt(toInstant(rs.getTimestamp("completed_at")));
        long cb = rs.getLong("created_by"); if (!rs.wasNull()) f.setCreatedBy(cb);
        long ub = rs.getLong("updated_by"); if (!rs.wasNull()) f.setUpdatedBy(ub);
        f.setCreatedAt(toInstant(rs.getTimestamp("created_at")));
        f.setUpdatedAt(toInstant(rs.getTimestamp("updated_at")));
        return f;
    }

    private static Instant toInstant(Timestamp ts) { return ts == null ? null : ts.toInstant(); }
    private static Timestamp toTs(Instant i)        { return i  == null ? null : Timestamp.from(i); }
}
