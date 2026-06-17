package com.akt.institute.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Appends immutable entries to audit_logs.
 *
 * Called via @Async so audit writes never block the caller's transaction.
 * All parameters are nullable — the table was designed to tolerate missing context.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final NamedParameterJdbcTemplate jdbc;

    private static final String INSERT_SQL = """
            INSERT INTO audit_logs
                (institute_id, user_id, action, entity_type, entity_id,
                 old_values, new_values, ip_address, user_agent, request_id)
            VALUES
                (:instituteId, :userId, :action, :entityType, :entityId,
                 :oldValues::jsonb, :newValues::jsonb, :ipAddress, :userAgent, :requestId)
            """;

    @Async
    public void log(Long instituteId, Long actorId, String action,
                    String entityType, String entityId,
                    String oldValues, String newValues,
                    String ipAddress, String userAgent) {
        try {
            jdbc.update(INSERT_SQL, new MapSqlParameterSource()
                    .addValue("instituteId", instituteId)
                    .addValue("userId",      actorId)
                    .addValue("action",      action)
                    .addValue("entityType",  entityType)
                    .addValue("entityId",    entityId)
                    .addValue("oldValues",   oldValues)
                    .addValue("newValues",   newValues)
                    .addValue("ipAddress",   ipAddress)
                    .addValue("userAgent",   userAgent)
                    .addValue("requestId",   java.util.UUID.randomUUID().toString()));
        } catch (Exception ex) {
            // Audit failures must never bubble up to the caller
            log.error("Failed to write audit log — action={}, entity={}/{}: {}",
                    action, entityType, entityId, ex.getMessage());
        }
    }

    /** Convenience overload — no old/new values (e.g. login events). */
    @Async
    public void log(Long instituteId, Long actorId, String action,
                    String entityType, String entityId,
                    String ipAddress, String userAgent) {
        log(instituteId, actorId, action, entityType, entityId, null, null, ipAddress, userAgent);
    }
}
