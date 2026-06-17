package com.akt.institute.audit.controller;

import com.akt.institute.audit.dto.AuditLogResponse;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Immutable audit trail for critical operations")
@SecurityRequirement(name = "bearerAuth")
public class AuditController {

    private final NamedParameterJdbcTemplate jdbc;

    @GetMapping
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    @Operation(summary = "List audit logs with filters and pagination")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        size = Math.min(size, 200);
        int offset = page * size;

        var sql = new StringBuilder("""
                SELECT al.id, al.institute_id, al.user_id,
                       CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS user_display_name,
                       al.action, al.entity_type, al.entity_id,
                       al.old_values::text, al.new_values::text,
                       al.ip_address, al.user_agent, al.created_at
                FROM audit_logs al
                LEFT JOIN users u ON u.id = al.user_id
                WHERE al.institute_id = :iid
                """);
        var params = new MapSqlParameterSource("iid", principal.getInstituteId());

        if (action != null && !action.isBlank()) {
            sql.append(" AND al.action = :action");
            params.addValue("action", action.toUpperCase());
        }
        if (entityType != null && !entityType.isBlank()) {
            sql.append(" AND al.entity_type = :entityType");
            params.addValue("entityType", entityType.toUpperCase());
        }
        if (userId != null) {
            sql.append(" AND al.user_id = :userId");
            params.addValue("userId", userId);
        }
        if (from != null) {
            sql.append(" AND al.created_at >= :from");
            params.addValue("from", Timestamp.from(from.atStartOfDay().toInstant(ZoneOffset.UTC)));
        }
        if (to != null) {
            sql.append(" AND al.created_at < :to");
            params.addValue("to", Timestamp.from(to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
        }

        // count
        String countSql = "SELECT COUNT(1) FROM (" + sql + ") sub";
        Long total = jdbc.queryForObject(countSql, params, Long.class);

        sql.append(" ORDER BY al.created_at DESC LIMIT :limit OFFSET :offset");
        params.addValue("limit", size).addValue("offset", offset);

        List<AuditLogResponse> rows = jdbc.query(sql.toString(), params, (rs, rowNum) -> mapRow(rs));
        var meta = PageMeta.of(page, size, total != null ? total : 0L);
        return ResponseEntity.ok(ApiResponse.paged(rows, meta));
    }

    private AuditLogResponse mapRow(ResultSet rs) throws java.sql.SQLException {
        return AuditLogResponse.builder()
                .id(rs.getLong("id"))
                .instituteId(rs.getLong("institute_id"))
                .userId(rs.getLong("user_id"))
                .userDisplayName(rs.getString("user_display_name"))
                .action(rs.getString("action"))
                .entityType(rs.getString("entity_type"))
                .entityId(rs.getString("entity_id"))
                .oldValues(rs.getString("old_values"))
                .newValues(rs.getString("new_values"))
                .ipAddress(rs.getString("ip_address"))
                .userAgent(rs.getString("user_agent"))
                .createdAt(rs.getTimestamp("created_at").toInstant())
                .build();
    }
}
