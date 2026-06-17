package com.akt.institute.lead.activity.repository;

import com.akt.institute.lead.activity.domain.LeadActivity;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class LeadActivityJdbcDao implements LeadActivityDao {

    private final NamedParameterJdbcTemplate jdbc;

    @Override
    public void record(LeadActivity a) {
        jdbc.update(
            """
            INSERT INTO lead_activities
                (institute_id, lead_id, action_type, lead_action, action_category, outcome, description, performed_by)
            VALUES
                (:iid, :leadId, :action, :leadAction, :category, :outcome, :desc, :by)
            """,
            new MapSqlParameterSource()
                .addValue("iid",        a.getInstituteId())
                .addValue("leadId",     a.getLeadId())
                .addValue("action",     a.getActionType())
                .addValue("leadAction", a.getLeadAction())
                .addValue("category",   a.getActionCategory())
                .addValue("outcome",    a.getOutcome())
                .addValue("desc",       a.getDescription())
                .addValue("by",         a.getPerformedBy())
        );
    }

    @Override
    public List<LeadActivity> findByLeadId(Long leadId, Long instituteId) {
        return jdbc.query(
            """
            SELECT la.id, la.institute_id, la.lead_id,
                   la.action_type, la.lead_action, la.action_category, la.outcome,
                   la.description, la.performed_by, la.created_at,
                   COALESCE(u.first_name || ' ' || COALESCE(u.last_name,''), u.username) AS performer_name
            FROM lead_activities la
            LEFT JOIN users u ON u.id = la.performed_by
            WHERE la.lead_id = :leadId AND la.institute_id = :iid
            ORDER BY la.created_at DESC
            """,
            new MapSqlParameterSource().addValue("leadId", leadId).addValue("iid", instituteId),
            LeadActivityJdbcDao::mapRow
        );
    }

    private static LeadActivity mapRow(ResultSet rs, int n) throws SQLException {
        LeadActivity a = new LeadActivity();
        a.setId(rs.getLong("id"));
        a.setInstituteId(rs.getLong("institute_id"));
        a.setLeadId(rs.getLong("lead_id"));
        a.setActionType(rs.getString("action_type"));
        a.setLeadAction(rs.getString("lead_action"));
        a.setActionCategory(rs.getString("action_category"));
        a.setOutcome(rs.getString("outcome"));
        a.setDescription(rs.getString("description"));
        long by = rs.getLong("performed_by");
        if (!rs.wasNull()) a.setPerformedBy(by);
        a.setPerformedByName(rs.getString("performer_name"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) a.setCreatedAt(ts.toInstant());
        return a;
    }
}
