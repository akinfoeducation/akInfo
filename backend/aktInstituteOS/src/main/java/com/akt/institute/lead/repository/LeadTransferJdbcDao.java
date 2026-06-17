package com.akt.institute.lead.repository;

import com.akt.institute.lead.domain.LeadTransfer;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class LeadTransferJdbcDao implements LeadTransferDao {

    private final NamedParameterJdbcTemplate jdbc;

    private static final RowMapper<LeadTransfer> ROW_MAPPER = (rs, i) -> {
        LeadTransfer t = new LeadTransfer();
        t.setId(rs.getLong("id"));
        t.setLeadId(rs.getLong("lead_id"));
        t.setInstituteId(rs.getLong("institute_id"));
        t.setTransferType(rs.getString("transfer_type"));
        long fromCaller = rs.getLong("from_caller_id");
        if (!rs.wasNull()) t.setFromCallerId(fromCaller);
        long toCaller = rs.getLong("to_caller_id");
        if (!rs.wasNull()) t.setToCallerId(toCaller);
        long toBranch = rs.getLong("to_branch_id");
        if (!rs.wasNull()) t.setToBranchId(toBranch);
        t.setNotes(rs.getString("notes"));
        t.setTransferredAt(rs.getTimestamp("transferred_at") != null
            ? rs.getTimestamp("transferred_at").toInstant() : null);
        long by = rs.getLong("transferred_by");
        if (!rs.wasNull()) t.setTransferredBy(by);
        return t;
    };

    @Override
    public void record(LeadTransfer transfer) {
        jdbc.update("""
            INSERT INTO lead_transfers
                (lead_id, institute_id, transfer_type, from_caller_id, to_caller_id,
                 to_branch_id, notes, transferred_by)
            VALUES
                (:leadId, :instituteId, :transferType, :fromCallerId, :toCallerId,
                 :toBranchId, :notes, :transferredBy)
            """,
            new MapSqlParameterSource()
                .addValue("leadId",        transfer.getLeadId())
                .addValue("instituteId",   transfer.getInstituteId())
                .addValue("transferType",  transfer.getTransferType())
                .addValue("fromCallerId",  transfer.getFromCallerId())
                .addValue("toCallerId",    transfer.getToCallerId())
                .addValue("toBranchId",    transfer.getToBranchId())
                .addValue("notes",         transfer.getNotes())
                .addValue("transferredBy", transfer.getTransferredBy())
        );
    }

    @Override
    public List<LeadTransfer> findByLeadId(Long leadId, Long instituteId) {
        return jdbc.query(
            "SELECT * FROM lead_transfers WHERE lead_id = :leadId AND institute_id = :iid " +
            "ORDER BY transferred_at DESC",
            new MapSqlParameterSource().addValue("leadId", leadId).addValue("iid", instituteId),
            ROW_MAPPER
        );
    }
}
