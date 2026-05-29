package com.akt.institute.notification.repository;

import com.akt.institute.notification.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class NotificationJdbcDao implements NotificationDao {

    private final NamedParameterJdbcTemplate jdbc;

    // ── Template ──────────────────────────────────────────────────────────────

    @Override
    public NotificationTemplate saveTemplate(NotificationTemplate t) {
        return t.getId() == null ? insertTemplate(t) : updateTemplate(t);
    }

    @Override
    public Optional<NotificationTemplate> findTemplateById(Long id, Long instituteId) {
        var sql = "SELECT * FROM notification_templates WHERE id=:id AND institute_id=:iid";
        var list = jdbc.query(sql,
            new MapSqlParameterSource().addValue("id", id).addValue("iid", instituteId),
            TEMPLATE_MAPPER);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Override
    public List<NotificationTemplate> findTemplatesByInstituteId(Long instituteId) {
        return jdbc.query(
            "SELECT * FROM notification_templates WHERE institute_id=:iid ORDER BY type, channel",
            new MapSqlParameterSource("iid", instituteId), TEMPLATE_MAPPER);
    }

    @Override
    public Optional<NotificationTemplate> findDefaultTemplate(Long instituteId, TemplateType type, String channel) {
        var sql = """
            SELECT * FROM notification_templates
            WHERE institute_id=:iid AND type=:type AND is_active=TRUE AND is_default=TRUE
              AND (channel=:channel OR channel='BOTH')
            ORDER BY (channel=:channel) DESC
            LIMIT 1
            """;
        var list = jdbc.query(sql,
            new MapSqlParameterSource()
                .addValue("iid", instituteId)
                .addValue("type", type.name())
                .addValue("channel", channel),
            TEMPLATE_MAPPER);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Override
    public void deleteTemplate(Long id, Long instituteId) {
        jdbc.update("UPDATE notification_templates SET is_active=FALSE WHERE id=:id AND institute_id=:iid",
            new MapSqlParameterSource().addValue("id", id).addValue("iid", instituteId));
    }

    // ── Log ───────────────────────────────────────────────────────────────────

    @Override
    public NotificationLog saveLog(NotificationLog log) {
        String sql = """
            INSERT INTO notification_logs
                (institute_id, channel, template_type, recipient_name, recipient_phone, recipient_email,
                 subject, message_preview, status, failure_reason, retry_count, sent_at,
                 related_type, related_id)
            VALUES
                (:iid, :channel, :templateType, :recipientName, :recipientPhone, :recipientEmail,
                 :subject, :messagePreview, :status, :failureReason, :retryCount, :sentAt,
                 :relatedType, :relatedId)
            """;
        var kh = new GeneratedKeyHolder();
        jdbc.update(sql, buildLogParams(log), kh, new String[]{"id"});
        log.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return log;
    }

    @Override
    public void updateLogStatus(Long id, NotificationStatus status, String failureReason, int retryCount) {
        jdbc.update("""
            UPDATE notification_logs SET
                status=:status, failure_reason=:failureReason, retry_count=:retryCount,
                sent_at = CASE WHEN :status='SENT' THEN CURRENT_TIMESTAMP ELSE sent_at END
            WHERE id=:id
            """,
            new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("status", status.name())
                .addValue("failureReason", failureReason)
                .addValue("retryCount", retryCount));
    }

    @Override
    public List<NotificationLog> findLogs(Long instituteId, String channel, String status, int page, int size) {
        var sql = new StringBuilder("SELECT * FROM notification_logs WHERE institute_id=:iid");
        var params = new MapSqlParameterSource("iid", instituteId);
        if (channel != null && !channel.isBlank()) {
            sql.append(" AND channel=:channel");
            params.addValue("channel", channel.toUpperCase());
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND status=:status");
            params.addValue("status", status.toUpperCase());
        }
        sql.append(" ORDER BY created_at DESC LIMIT :size OFFSET :offset");
        params.addValue("size", size).addValue("offset", (long) page * size);
        return jdbc.query(sql.toString(), params, LOG_MAPPER);
    }

    @Override
    public long countLogs(Long instituteId, String channel, String status) {
        var sql = new StringBuilder("SELECT COUNT(1) FROM notification_logs WHERE institute_id=:iid");
        var params = new MapSqlParameterSource("iid", instituteId);
        if (channel != null && !channel.isBlank()) {
            sql.append(" AND channel=:channel");
            params.addValue("channel", channel.toUpperCase());
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND status=:status");
            params.addValue("status", status.toUpperCase());
        }
        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count == null ? 0 : count;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private NotificationTemplate insertTemplate(NotificationTemplate t) {
        String sql = """
            INSERT INTO notification_templates
                (institute_id, name, type, channel, subject, body, variables, is_active, is_default, created_by)
            VALUES (:iid, :name, :type, :channel, :subject, :body, :variables, :isActive, :isDefault, NULL)
            """;
        var kh = new GeneratedKeyHolder();
        jdbc.update(sql, buildTemplateParams(t), kh, new String[]{"id"});
        t.setId(Objects.requireNonNull(kh.getKeyAs(Long.class)));
        return t;
    }

    private NotificationTemplate updateTemplate(NotificationTemplate t) {
        jdbc.update("""
            UPDATE notification_templates SET
                name=:name, type=:type, channel=:channel, subject=:subject,
                body=:body, variables=:variables, is_active=:isActive, is_default=:isDefault,
                updated_at=CURRENT_TIMESTAMP
            WHERE id=:id AND institute_id=:iid
            """, buildTemplateParams(t).addValue("id", t.getId()));
        return t;
    }

    private static MapSqlParameterSource buildTemplateParams(NotificationTemplate t) {
        return new MapSqlParameterSource()
            .addValue("iid",       t.getInstituteId())
            .addValue("name",      t.getName())
            .addValue("type",      t.getType() != null ? t.getType().name() : null)
            .addValue("channel",   t.getChannel())
            .addValue("subject",   t.getSubject())
            .addValue("body",      t.getBody())
            .addValue("variables", t.getVariables())
            .addValue("isActive",  t.isActive())
            .addValue("isDefault", t.isDefault());
    }

    private static MapSqlParameterSource buildLogParams(NotificationLog l) {
        return new MapSqlParameterSource()
            .addValue("iid",           l.getInstituteId())
            .addValue("channel",       l.getChannel() != null ? l.getChannel().name() : null)
            .addValue("templateType",  l.getTemplateType())
            .addValue("recipientName", l.getRecipientName())
            .addValue("recipientPhone", l.getRecipientPhone())
            .addValue("recipientEmail", l.getRecipientEmail())
            .addValue("subject",       l.getSubject())
            .addValue("messagePreview", l.getMessagePreview())
            .addValue("status",        l.getStatus() != null ? l.getStatus().name() : "PENDING")
            .addValue("failureReason", l.getFailureReason())
            .addValue("retryCount",    l.getRetryCount())
            .addValue("sentAt",        l.getSentAt() != null ? Timestamp.from(l.getSentAt()) : null)
            .addValue("relatedType",   l.getRelatedType())
            .addValue("relatedId",     l.getRelatedId());
    }

    private static final RowMapper<NotificationTemplate> TEMPLATE_MAPPER = (rs, rn) -> {
        var t = new NotificationTemplate();
        t.setId(rs.getLong("id"));
        t.setInstituteId(rs.getLong("institute_id"));
        t.setName(rs.getString("name"));
        String type = rs.getString("type");
        if (type != null) t.setType(TemplateType.valueOf(type));
        t.setChannel(rs.getString("channel"));
        t.setSubject(rs.getString("subject"));
        t.setBody(rs.getString("body"));
        t.setVariables(rs.getString("variables"));
        t.setActive(rs.getBoolean("is_active"));
        t.setDefault(rs.getBoolean("is_default"));
        Timestamp ca = rs.getTimestamp("created_at");
        if (ca != null) t.setCreatedAt(ca.toInstant());
        Timestamp ua = rs.getTimestamp("updated_at");
        if (ua != null) t.setUpdatedAt(ua.toInstant());
        return t;
    };

    private static final RowMapper<NotificationLog> LOG_MAPPER = (rs, rn) -> {
        var l = new NotificationLog();
        l.setId(rs.getLong("id"));
        l.setInstituteId(rs.getLong("institute_id"));
        String ch = rs.getString("channel");
        if (ch != null) l.setChannel(NotificationChannel.valueOf(ch));
        l.setTemplateType(rs.getString("template_type"));
        l.setRecipientName(rs.getString("recipient_name"));
        l.setRecipientPhone(rs.getString("recipient_phone"));
        l.setRecipientEmail(rs.getString("recipient_email"));
        l.setSubject(rs.getString("subject"));
        l.setMessagePreview(rs.getString("message_preview"));
        String st = rs.getString("status");
        if (st != null) l.setStatus(NotificationStatus.valueOf(st));
        l.setFailureReason(rs.getString("failure_reason"));
        l.setRetryCount(rs.getInt("retry_count"));
        Timestamp sentAt = rs.getTimestamp("sent_at");
        if (sentAt != null) l.setSentAt(sentAt.toInstant());
        l.setRelatedType(rs.getString("related_type"));
        long rid = rs.getLong("related_id");
        if (!rs.wasNull()) l.setRelatedId(rid);
        Timestamp ca = rs.getTimestamp("created_at");
        if (ca != null) l.setCreatedAt(ca.toInstant());
        return l;
    };
}
