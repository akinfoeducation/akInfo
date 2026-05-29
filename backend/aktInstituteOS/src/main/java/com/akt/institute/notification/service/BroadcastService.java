package com.akt.institute.notification.service;

import com.akt.institute.notification.domain.NotificationChannel;
import com.akt.institute.notification.dto.BroadcastRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BroadcastService {

    private final NamedParameterJdbcTemplate jdbc;
    private final NotificationDispatcher dispatcher;

    @Async("notificationExecutor")
    public void broadcast(BroadcastRequest req, Long instituteId) {
        NotificationChannel channel;
        try {
            channel = NotificationChannel.valueOf(req.getChannel().toUpperCase());
        } catch (IllegalArgumentException e) {
            log.error("Invalid broadcast channel: {}", req.getChannel());
            return;
        }

        List<RecipientRow> recipients = fetchRecipients(req, instituteId);
        log.info("Broadcasting to {} recipients via {}", recipients.size(), channel);

        boolean isHtml = channel == NotificationChannel.EMAIL;

        for (RecipientRow r : recipients) {
            dispatcher.dispatchRaw(
                instituteId, channel,
                req.getSubject() != null ? req.getSubject() : "Message from AKT Info Institute",
                req.getMessage(), isHtml,
                r.name(), r.phone(), r.email(),
                "BROADCAST", null
            );
        }
    }

    private List<RecipientRow> fetchRecipients(BroadcastRequest req, Long instituteId) {
        var sql = new StringBuilder("""
            SELECT DISTINCT
                CONCAT(a.first_name, COALESCE(' '||a.last_name,'')) AS name,
                a.phone, a.email
            FROM admissions a
            WHERE a.institute_id = :iid AND a.deleted_at IS NULL
            """);
        var params = new MapSqlParameterSource("iid", instituteId);

        if (req.getCourseId() != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM courses c WHERE c.name=a.course_name AND c.id=:courseId AND c.institute_id=:iid)");
            params.addValue("courseId", req.getCourseId());
        }
        if (req.getBatchId() != null) {
            sql.append(" AND a.batch_id=:batchId");
            params.addValue("batchId", req.getBatchId());
        }
        if (req.getAdmissionStatus() != null && !req.getAdmissionStatus().isBlank()) {
            sql.append(" AND a.status=:admStatus");
            params.addValue("admStatus", req.getAdmissionStatus().toUpperCase());
        }
        if (Boolean.TRUE.equals(req.getFeePendingOnly())) {
            sql.append(" AND (a.fees_agreed - a.fees_paid) > 0");
        }
        if (req.getLeadStatus() != null && !req.getLeadStatus().isBlank()) {
            sql.append(" AND EXISTS (SELECT 1 FROM leads l WHERE l.id=a.lead_id AND l.status=:leadStatus)");
            params.addValue("leadStatus", req.getLeadStatus().toUpperCase());
        }

        sql.append(" LIMIT 500");  // safety cap per broadcast

        return jdbc.query(sql.toString(), params,
            (rs, rn) -> new RecipientRow(rs.getString("name"), rs.getString("phone"), rs.getString("email")));
    }

    record RecipientRow(String name, String phone, String email) {}
}
