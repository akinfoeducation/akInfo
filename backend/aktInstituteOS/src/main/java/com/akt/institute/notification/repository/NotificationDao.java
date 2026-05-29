package com.akt.institute.notification.repository;

import com.akt.institute.notification.domain.NotificationLog;
import com.akt.institute.notification.domain.NotificationStatus;
import com.akt.institute.notification.domain.NotificationTemplate;
import com.akt.institute.notification.domain.TemplateType;

import java.util.List;
import java.util.Optional;

public interface NotificationDao {

    // ── Templates ─────────────────────────────────────────────────────────────

    NotificationTemplate saveTemplate(NotificationTemplate template);

    Optional<NotificationTemplate> findTemplateById(Long id, Long instituteId);

    List<NotificationTemplate> findTemplatesByInstituteId(Long instituteId);

    Optional<NotificationTemplate> findDefaultTemplate(Long instituteId, TemplateType type, String channel);

    void deleteTemplate(Long id, Long instituteId);

    // ── Logs ──────────────────────────────────────────────────────────────────

    NotificationLog saveLog(NotificationLog log);

    void updateLogStatus(Long id, NotificationStatus status, String failureReason, int retryCount);

    List<NotificationLog> findLogs(Long instituteId, String channel, String status, int page, int size);

    long countLogs(Long instituteId, String channel, String status);
}
