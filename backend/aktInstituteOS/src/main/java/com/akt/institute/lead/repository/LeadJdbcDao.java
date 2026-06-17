package com.akt.institute.lead.repository;

import com.akt.institute.lead.domain.*;
import com.akt.institute.lead.domain.DeliveryMode;

import java.time.LocalDate;

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
            course_interested, source, status, lead_stage, assigned_to_id, assigned_at, address,
            current_work, interested_for, notes,
            delivery_mode, preferred_batch, preferred_branch,
            parent_name, parent_phone, parent_email,
            next_follow_up_at, last_contacted_at, converted_at,
            not_connected_at, previous_caller_id, branch_id,
            caller_id, counsellor_id, handed_off_at,
            visit_planned_at, visit_done_at, booking_confirmed_at, admission_done_at,
            version, created_at, updated_at, created_by, updated_by, deleted_at
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
    public boolean hasActiveLeadByPhone(String phone, Long instituteId) {
        List<String> deadStates = LeadStatus.ROUTABLE_TERMINAL.stream().map(Enum::name).toList();
        Long count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM leads" +
                " WHERE phone = :phone AND institute_id = :instituteId AND deleted_at IS NULL" +
                "   AND status NOT IN (:deadStates)",
                new MapSqlParameterSource()
                    .addValue("phone", phone)
                    .addValue("instituteId", instituteId)
                    .addValue("deadStates", deadStates),
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
    public List<Lead> findWithFilters(Long instituteId, String status, String stage, String source, String q,
                                      Long assignedToId, LocalDate from, LocalDate to,
                                      int page, int size, String sortField, String sortDir) {
        var sql = new StringBuilder("SELECT " + SELECT_COLS + " FROM leads WHERE deleted_at IS NULL AND institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, status, stage, source, q, assignedToId, from, to);
        String col = sanitizeSortField(sortField);
        String dir = "desc".equalsIgnoreCase(sortDir) ? "DESC" : "ASC";
        sql.append(" ORDER BY ").append(col).append(" ").append(dir);
        sql.append(" LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, ROW_MAPPER);
    }

    @Override
    public long countWithFilters(Long instituteId, String status, String stage, String source, String q,
                                 Long assignedToId, LocalDate from, LocalDate to) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM leads WHERE deleted_at IS NULL AND institute_id = :instituteId");
        var params = new MapSqlParameterSource("instituteId", instituteId);
        applyFilters(sql, params, status, stage, source, q, assignedToId, from, to);
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0L : count;
    }

    // ── assign() also stamps caller_id permanently ────────────────────────────
    @Override
    public void assign(Long leadId, Long callerId, Long updatedBy) {
        jdbc.update(
            """
            UPDATE leads
               SET assigned_to_id = :callerId,
                   caller_id      = COALESCE(caller_id, :callerId),
                   assigned_at    = CURRENT_TIMESTAMP,
                   status         = :status,
                   version        = version + 1,
                   updated_at     = CURRENT_TIMESTAMP,
                   updated_by     = :updatedBy
             WHERE id = :id
            """,
            new MapSqlParameterSource()
                .addValue("callerId", callerId)
                .addValue("status", LeadStatus.ASSIGNED.name())
                .addValue("updatedBy", updatedBy)
                .addValue("id", leadId)
        );
    }

    @Override
    public void unassign(Long leadId, Long updatedBy) {
        // caller_id is intentionally preserved — it keeps KPI attribution intact
        jdbc.update(
            "UPDATE leads SET assigned_to_id = NULL, assigned_at = NULL, status = :status, version = version + 1, updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy WHERE id = :id",
            new MapSqlParameterSource()
                .addValue("status", LeadStatus.NEW_LEAD.name())
                .addValue("updatedBy", updatedBy)
                .addValue("id", leadId)
        );
    }

    // ── Counsellor handoff — atomic; transitions ownership on VISIT_DONE ─────
    @Override
    public int handoffToCounsellor(Long leadId, Long counsellorId, Long actorId) {
        return jdbc.update(
            """
            UPDATE leads
               SET counsellor_id   = :counsellorId,
                   assigned_to_id  = :counsellorId,
                   handed_off_at   = CURRENT_TIMESTAMP,
                   visit_done_at   = CURRENT_TIMESTAMP,
                   status          = :visitDone,
                   lead_stage      = :stage,
                   version         = version + 1,
                   updated_at      = CURRENT_TIMESTAMP,
                   updated_by      = :actorId
             WHERE id = :id
               AND deleted_at IS NULL
            """,
            new MapSqlParameterSource()
                .addValue("counsellorId", counsellorId)
                .addValue("visitDone",    LeadStatus.VISIT_DONE.name())
                .addValue("stage",        com.akt.institute.lead.domain.LeadStage.COUNSELLOR_PIPELINE.name())
                .addValue("actorId",      actorId)
                .addValue("id",           leadId)
        );
    }

    // ── ONLINE lead handoff — ownership transfer at BOOKING_CONFIRMED ────────
    @Override
    public int handoffOnlineLead(Long leadId, Long counsellorId, Long actorId) {
        return jdbc.update(
            """
            UPDATE leads
               SET counsellor_id   = :counsellorId,
                   assigned_to_id  = :counsellorId,
                   handed_off_at   = CURRENT_TIMESTAMP,
                   lead_stage      = :stage,
                   version         = version + 1,
                   updated_at      = CURRENT_TIMESTAMP,
                   updated_by      = :actorId
             WHERE id = :id
               AND counsellor_id IS NULL
               AND deleted_at IS NULL
            """,
            new MapSqlParameterSource()
                .addValue("counsellorId", counsellorId)
                .addValue("stage",        com.akt.institute.lead.domain.LeadStage.COUNSELLOR_PIPELINE.name())
                .addValue("actorId",      actorId)
                .addValue("id",           leadId)
        );
    }

    // ── Walk-in self-claim — counsellor directly picks up a walk-in lead ─────
    @Override
    public int claimAsWalkIn(Long leadId, Long counsellorId, Long updatedBy) {
        return jdbc.update(
            """
            UPDATE leads
               SET counsellor_id  = :counsellorId,
                   assigned_to_id = :counsellorId,
                   handed_off_at  = CURRENT_TIMESTAMP,
                   visit_done_at  = CURRENT_TIMESTAMP,
                   status         = :visitDone,
                   lead_stage     = :stage,
                   version        = version + 1,
                   updated_at     = CURRENT_TIMESTAMP,
                   updated_by     = :updatedBy
             WHERE id = :id
               AND counsellor_id IS NULL
               AND deleted_at IS NULL
            """,
            new MapSqlParameterSource()
                .addValue("counsellorId", counsellorId)
                .addValue("visitDone",    LeadStatus.VISIT_DONE.name())
                .addValue("stage",        com.akt.institute.lead.domain.LeadStage.COUNSELLOR_PIPELINE.name())
                .addValue("updatedBy",    updatedBy)
                .addValue("id",           leadId)
        );
    }

    @Override
    public List<Lead> findByIds(List<Long> ids, Long instituteId) {
        if (ids == null || ids.isEmpty()) return List.of();
        return jdbc.query(
            "SELECT " + SELECT_COLS + " FROM leads WHERE id IN (:ids) AND institute_id = :iid AND deleted_at IS NULL",
            new MapSqlParameterSource().addValue("ids", ids).addValue("iid", instituteId),
            ROW_MAPPER
        );
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

    // ── Retry pool ──────────────────────────────────────────────────────────

    @Override
    public List<Lead> findRetryPool(Long instituteId, int retryAfterMinutes, int page, int size) {
        return jdbc.query(
            "SELECT " + SELECT_COLS + " FROM leads" +
            " WHERE institute_id = :iid AND deleted_at IS NULL" +
            "   AND status = 'NOT_CONNECTED'" +
            "   AND not_connected_at IS NOT NULL" +
            "   AND not_connected_at < NOW() - (:minutes * INTERVAL '1 minute')" +
            " ORDER BY not_connected_at ASC" +
            " LIMIT :size OFFSET :offset",
            new MapSqlParameterSource()
                .addValue("iid",     instituteId)
                .addValue("minutes", retryAfterMinutes)
                .addValue("size",    size)
                .addValue("offset",  (long) page * size),
            ROW_MAPPER
        );
    }

    @Override
    public long countRetryPool(Long instituteId, int retryAfterMinutes) {
        Long count = jdbc.queryForObject(
            "SELECT COUNT(1) FROM leads" +
            " WHERE institute_id = :iid AND deleted_at IS NULL" +
            "   AND status = 'NOT_CONNECTED'" +
            "   AND not_connected_at IS NOT NULL" +
            "   AND not_connected_at < NOW() - (:minutes * INTERVAL '1 minute')",
            new MapSqlParameterSource()
                .addValue("iid",     instituteId)
                .addValue("minutes", retryAfterMinutes),
            Long.class
        );
        return count == null ? 0L : count;
    }

    /**
     * Atomic claim: sets assigned_to_id only if lead is still NOT_CONNECTED.
     * Uses a WHERE clause guard to prevent double-claim without a separate SELECT FOR UPDATE.
     */
    @Override
    public int claimFromPool(Long leadId, Long callerId, Long updatedBy) {
        return jdbc.update(
            "UPDATE leads" +
            "   SET assigned_to_id = :callerId," +
            "       caller_id      = COALESCE(caller_id, :callerId)," +
            "       assigned_at    = CURRENT_TIMESTAMP," +
            "       status         = :assigned," +
            "       not_connected_at = NULL," +
            "       previous_caller_id = assigned_to_id," +
            "       version        = version + 1," +
            "       updated_at     = CURRENT_TIMESTAMP," +
            "       updated_by     = :updatedBy" +
            " WHERE id = :id" +
            "   AND status = 'NOT_CONNECTED'" +
            "   AND not_connected_at < NOW() - (30 * INTERVAL '1 minute')",
            new MapSqlParameterSource()
                .addValue("callerId",  callerId)
                .addValue("assigned",  LeadStatus.ASSIGNED.name())
                .addValue("updatedBy", updatedBy)
                .addValue("id",        leadId)
        );
    }

    // ── Same-number routing ─────────────────────────────────────────────────

    @Override
    public Optional<Long> findLastCallerByPhone(String phone, Long instituteId, int withinDays) {
        // Prefer the dedicated caller_id column; fall back to assigned/previous for older rows
        List<Long> rows = jdbc.query(
            "SELECT COALESCE(caller_id, assigned_to_id, previous_caller_id) AS caller_id" +
            " FROM leads" +
            " WHERE institute_id = :iid AND phone = :phone AND deleted_at IS NULL" +
            "   AND COALESCE(caller_id, assigned_to_id, previous_caller_id) IS NOT NULL" +
            "   AND updated_at >= NOW() - (:days * INTERVAL '1 day')" +
            " ORDER BY updated_at DESC LIMIT 1",
            new MapSqlParameterSource()
                .addValue("iid",   instituteId)
                .addValue("phone", phone)
                .addValue("days",  withinDays),
            (rs, i) -> rs.getLong("caller_id")
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
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
                                     String status, String stage, String source, String q,
                                     Long assignedToId, LocalDate from, LocalDate to) {
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = :status");
            params.addValue("status", status);
        }
        // Stage is a coarse pipeline bucket derived from status. We match on the set of
        // statuses that map to the requested stage (via LeadStage.fromStatus) rather than
        // the stored lead_stage column, which can lag behind status on some transitions —
        // this keeps the filter consistent with the status shown in the list.
        if (stage != null && !stage.isBlank()) {
            LeadStage target;
            try {
                target = LeadStage.valueOf(stage.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                target = null;
            }
            if (target != null) {
                final LeadStage t = target;
                List<String> stageStatuses = java.util.Arrays.stream(LeadStatus.values())
                    .filter(s -> LeadStage.fromStatus(s) == t)
                    .map(Enum::name)
                    .toList();
                sql.append(" AND status IN (:stageStatuses)");
                params.addValue("stageStatuses", stageStatuses);
            }
        }
        if (source != null && !source.isBlank()) {
            sql.append(" AND source = :source");
            params.addValue("source", source);
        }
        if (assignedToId != null) {
            sql.append(" AND assigned_to_id = :assignedToId");
            params.addValue("assignedToId", assignedToId);
        }
        if (from != null) {
            sql.append(" AND DATE(assigned_at) >= :from");
            params.addValue("from", java.sql.Date.valueOf(from));
        }
        if (to != null) {
            sql.append(" AND DATE(assigned_at) <= :to");
            params.addValue("to", java.sql.Date.valueOf(to));
        }
        if (q != null && !q.isBlank()) {
            String pattern    = "%" + q.toLowerCase().trim() + "%";
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
                    course_interested, source, status, lead_stage, assigned_to_id, assigned_at, address,
                    current_work, interested_for, notes,
                    delivery_mode, preferred_batch, preferred_branch,
                    parent_name, parent_phone, parent_email,
                    next_follow_up_at, last_contacted_at, converted_at,
                    not_connected_at, previous_caller_id, branch_id,
                    caller_id, counsellor_id, handed_off_at,
                    visit_planned_at, visit_done_at, booking_confirmed_at, admission_done_at,
                    created_at, updated_at, created_by, updated_by)
                VALUES (
                    :uuid, :instituteId, :firstName, :lastName, :phone, :whatsappNumber, :email,
                    :courseInterested, :source, :status, :leadStage, :assignedToId, :assignedAt, :address,
                    :currentWork, :interestedFor, :notes,
                    :deliveryMode, :preferredBatch, :preferredBranch,
                    :parentName, :parentPhone, :parentEmail,
                    :nextFollowUpAt, :lastContactedAt, :convertedAt,
                    :notConnectedAt, :previousCallerId, :branchId,
                    :callerId, :counsellorId, :handedOffAt,
                    :visitPlannedAt, :visitDoneAt, :bookingConfirmedAt, :admissionDoneAt,
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
                    course_interested = :courseInterested, source = :source,
                    status = :status, lead_stage = :leadStage,
                    assigned_to_id = :assignedToId, assigned_at = :assignedAt, address = :address,
                    current_work = :currentWork, interested_for = :interestedFor, notes = :notes,
                    delivery_mode = :deliveryMode, preferred_batch = :preferredBatch,
                    preferred_branch = :preferredBranch,
                    parent_name = :parentName, parent_phone = :parentPhone, parent_email = :parentEmail,
                    next_follow_up_at = :nextFollowUpAt, last_contacted_at = :lastContactedAt,
                    converted_at = :convertedAt, deleted_at = :deletedAt,
                    not_connected_at = :notConnectedAt, previous_caller_id = :previousCallerId,
                    branch_id = :branchId,
                    caller_id = :callerId, counsellor_id = :counsellorId, handed_off_at = :handedOffAt,
                    visit_planned_at = :visitPlannedAt, visit_done_at = :visitDoneAt,
                    booking_confirmed_at = :bookingConfirmedAt, admission_done_at = :admissionDoneAt,
                    version = version + 1,
                    updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                WHERE id = :id AND version = :version
                """;
        int rows = jdbc.update(sql, buildParams(lead)
            .addValue("id", lead.getId())
            .addValue("version", lead.getVersion())
            .addValue("deletedAt", toTs(lead.getDeletedAt())));
        if (rows == 0) {
            throw new org.springframework.dao.OptimisticLockingFailureException(
                "Lead " + lead.getId() + " was modified by another user. Please reload and try again.");
        }
        lead.setVersion(lead.getVersion() + 1);
        return lead;
    }

    private static MapSqlParameterSource buildParams(Lead l) {
        Long actor = AuditUtil.getCurrentUserId();
        return new MapSqlParameterSource()
                .addValue("uuid",                l.getUuid())
                .addValue("instituteId",         l.getInstituteId())
                .addValue("firstName",           l.getFirstName())
                .addValue("lastName",            l.getLastName())
                .addValue("phone",               l.getPhone())
                .addValue("whatsappNumber",      l.getWhatsappNumber())
                .addValue("email",               l.getEmail())
                .addValue("courseInterested",    l.getCourseInterested())
                .addValue("source",              l.getSource() == null ? LeadSource.WALK_IN.name() : l.getSource().name())
                .addValue("status",              l.getStatus() == null ? LeadStatus.NEW_LEAD.name() : l.getStatus().name())
                .addValue("leadStage",           l.getStage() == null ? com.akt.institute.lead.domain.LeadStage.CALLER_PIPELINE.name() : l.getStage().name())
                .addValue("version",             l.getVersion() != null ? l.getVersion() : 0L)
                .addValue("assignedToId",        l.getAssignedToId())
                .addValue("assignedAt",          toTs(l.getAssignedAt()))
                .addValue("address",             l.getAddress())
                .addValue("currentWork",         l.getCurrentWork() == null ? null : l.getCurrentWork().name())
                .addValue("interestedFor",       l.getInterestedFor() == null ? null : l.getInterestedFor().name())
                .addValue("notes",               l.getNotes())
                .addValue("deliveryMode",        l.getDeliveryMode() == null ? null : l.getDeliveryMode().name())
                .addValue("preferredBatch",      l.getPreferredBatch())
                .addValue("preferredBranch",     l.getPreferredBranch())
                .addValue("parentName",          l.getParentName())
                .addValue("parentPhone",         l.getParentPhone())
                .addValue("parentEmail",         l.getParentEmail())
                .addValue("nextFollowUpAt",      toTs(l.getNextFollowUpAt()))
                .addValue("lastContactedAt",     toTs(l.getLastContactedAt()))
                .addValue("convertedAt",         toTs(l.getConvertedAt()))
                .addValue("notConnectedAt",      toTs(l.getNotConnectedAt()))
                .addValue("previousCallerId",    l.getPreviousCallerId())
                .addValue("branchId",            l.getBranchId())
                // dual ownership (Fix 1)
                .addValue("callerId",            l.getCallerId())
                .addValue("counsellorId",        l.getCounsellorId())
                .addValue("handedOffAt",         toTs(l.getHandedOffAt()))
                .addValue("visitPlannedAt",      toTs(l.getVisitPlannedAt()))
                .addValue("visitDoneAt",         toTs(l.getVisitDoneAt()))
                .addValue("bookingConfirmedAt",  toTs(l.getBookingConfirmedAt()))
                .addValue("admissionDoneAt",     toTs(l.getAdmissionDoneAt()))
                .addValue("createdBy",           actor)
                .addValue("updatedBy",           actor);
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
        if (src != null) {
            try { l.setSource(LeadSource.valueOf(src)); }
            catch (IllegalArgumentException ignored) { l.setSource(LeadSource.WALK_IN); }
        }
        String status = rs.getString("status");
        if (status != null) {
            try { l.setStatus(LeadStatus.valueOf(status)); }
            catch (IllegalArgumentException ignored) { l.setStatus(LeadStatus.NEW_LEAD); }
        }
        String stage = rs.getString("lead_stage");
        if (stage != null) {
            try { l.setStage(com.akt.institute.lead.domain.LeadStage.valueOf(stage)); }
            catch (IllegalArgumentException ignored) {
                l.setStage(com.akt.institute.lead.domain.LeadStage.fromStatus(l.getStatus()));
            }
        } else {
            l.setStage(com.akt.institute.lead.domain.LeadStage.fromStatus(l.getStatus()));
        }
        long assignedTo = rs.getLong("assigned_to_id");
        if (!rs.wasNull()) l.setAssignedToId(assignedTo);
        l.setAssignedAt(toInstant(rs.getTimestamp("assigned_at")));
        l.setAddress(rs.getString("address"));
        String cw = rs.getString("current_work");
        if (cw != null) l.setCurrentWork(CurrentWork.valueOf(cw));
        String iFor = rs.getString("interested_for");
        if (iFor != null) l.setInterestedFor(InterestedFor.valueOf(iFor));
        l.setNotes(rs.getString("notes"));
        String dm = rs.getString("delivery_mode");
        if (dm != null) {
            try { l.setDeliveryMode(DeliveryMode.valueOf(dm)); }
            catch (IllegalArgumentException ignored) { }
        }
        l.setPreferredBatch(rs.getString("preferred_batch"));
        l.setPreferredBranch(rs.getString("preferred_branch"));
        l.setParentName(rs.getString("parent_name"));
        l.setParentPhone(rs.getString("parent_phone"));
        l.setParentEmail(rs.getString("parent_email"));
        l.setVersion(rs.getLong("version"));
        l.setNextFollowUpAt(toInstant(rs.getTimestamp("next_follow_up_at")));
        l.setLastContactedAt(toInstant(rs.getTimestamp("last_contacted_at")));
        l.setConvertedAt(toInstant(rs.getTimestamp("converted_at")));
        l.setNotConnectedAt(toInstant(rs.getTimestamp("not_connected_at")));
        long prevCaller = rs.getLong("previous_caller_id");
        if (!rs.wasNull()) l.setPreviousCallerId(prevCaller);
        long branchId = rs.getLong("branch_id");
        if (!rs.wasNull()) l.setBranchId(branchId);
        // dual ownership (Fix 1)
        long callerId = rs.getLong("caller_id");
        if (!rs.wasNull()) l.setCallerId(callerId);
        long counsellorId = rs.getLong("counsellor_id");
        if (!rs.wasNull()) l.setCounsellorId(counsellorId);
        l.setHandedOffAt(toInstant(rs.getTimestamp("handed_off_at")));
        l.setVisitPlannedAt(toInstant(rs.getTimestamp("visit_planned_at")));
        l.setVisitDoneAt(toInstant(rs.getTimestamp("visit_done_at")));
        l.setBookingConfirmedAt(toInstant(rs.getTimestamp("booking_confirmed_at")));
        l.setAdmissionDoneAt(toInstant(rs.getTimestamp("admission_done_at")));
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
