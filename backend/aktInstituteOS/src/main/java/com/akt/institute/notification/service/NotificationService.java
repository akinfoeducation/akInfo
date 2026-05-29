package com.akt.institute.notification.service;

import com.akt.institute.notification.domain.*;
import com.akt.institute.notification.dto.*;
import com.akt.institute.notification.repository.NotificationDao;
import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.dto.PageMeta;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationDao  notificationDao;
    private final NotificationDispatcher dispatcher;
    private final BroadcastService broadcastService;

    // ── Templates ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<NotificationTemplateResponse> listTemplates(Long instituteId) {
        return notificationDao.findTemplatesByInstituteId(instituteId)
            .stream().map(this::toTemplateResponse).toList();
    }

    @Transactional
    public NotificationTemplateResponse saveTemplate(SaveTemplateRequest req, Long instituteId) {
        TemplateType type;
        try {
            type = TemplateType.valueOf(req.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid template type: " + req.getType()
                + ". Valid: " + Arrays.toString(TemplateType.values()));
        }

        var template = NotificationTemplate.builder()
            .instituteId(instituteId)
            .name(req.getName())
            .type(type)
            .channel(req.getChannel().toUpperCase())
            .subject(req.getSubject())
            .body(req.getBody())
            .variables(req.getVariables())
            .isActive(true)
            .isDefault(req.isDefault())
            .build();

        return toTemplateResponse(notificationDao.saveTemplate(template));
    }

    @Transactional
    public NotificationTemplateResponse updateTemplate(Long id, SaveTemplateRequest req, Long instituteId) {
        var existing = notificationDao.findTemplateById(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("NotificationTemplate", id));

        TemplateType type;
        try {
            type = TemplateType.valueOf(req.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid template type: " + req.getType());
        }

        existing.setName(req.getName());
        existing.setType(type);
        existing.setChannel(req.getChannel().toUpperCase());
        existing.setSubject(req.getSubject());
        existing.setBody(req.getBody());
        existing.setVariables(req.getVariables());
        existing.setDefault(req.isDefault());

        return toTemplateResponse(notificationDao.saveTemplate(existing));
    }

    @Transactional
    public void deleteTemplate(Long id, Long instituteId) {
        notificationDao.findTemplateById(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("NotificationTemplate", id));
        notificationDao.deleteTemplate(id, instituteId);
    }

    // ── Manual send ───────────────────────────────────────────────────────────

    public void sendManual(ManualSendRequest req, Long instituteId) {
        NotificationChannel channel;
        try {
            channel = NotificationChannel.valueOf(req.getChannel().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid channel: " + req.getChannel());
        }

        boolean isHtml = channel == NotificationChannel.EMAIL;

        dispatcher.dispatchRaw(
            instituteId, channel,
            req.getSubject() != null ? req.getSubject() : "Message from AKT Info Institute",
            req.getMessage(), isHtml,
            req.getRecipientName(),
            req.getRecipientPhone(),
            req.getRecipientEmail(),
            "MANUAL", null
        );

        log.info("Manual {} queued for {}", channel, req.getRecipientName());
    }

    // ── Broadcast ─────────────────────────────────────────────────────────────

    public void broadcast(BroadcastRequest req, Long instituteId) {
        broadcastService.broadcast(req, instituteId);
        log.info("Broadcast queued via {} for instituteId={}", req.getChannel(), instituteId);
    }

    // ── Logs ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ApiResponse<List<NotificationLogResponse>> listLogs(
        Long instituteId, String channel, String status, int page, int size
    ) {
        int capped = Math.min(size, 100);
        List<NotificationLogResponse> logs = notificationDao.findLogs(instituteId, channel, status, page, capped)
            .stream().map(this::toLogResponse).toList();
        long total = notificationDao.countLogs(instituteId, channel, status);
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / capped);

        return ApiResponse.paged(logs, PageMeta.builder()
            .page(page).size(capped).total(total).totalPages(totalPages)
            .hasNext((long) (page + 1) * capped < total)
            .hasPrevious(page > 0)
            .build());
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private NotificationTemplateResponse toTemplateResponse(NotificationTemplate t) {
        return NotificationTemplateResponse.builder()
            .id(t.getId())
            .name(t.getName())
            .type(t.getType() != null ? t.getType().name() : null)
            .channel(t.getChannel())
            .subject(t.getSubject())
            .body(t.getBody())
            .variables(t.getVariables())
            .isActive(t.isActive())
            .isDefault(t.isDefault())
            .createdAt(t.getCreatedAt())
            .updatedAt(t.getUpdatedAt())
            .build();
    }

    private NotificationLogResponse toLogResponse(NotificationLog l) {
        return NotificationLogResponse.builder()
            .id(l.getId())
            .channel(l.getChannel() != null ? l.getChannel().name() : null)
            .templateType(l.getTemplateType())
            .recipientName(l.getRecipientName())
            .recipientPhone(l.getRecipientPhone())
            .recipientEmail(l.getRecipientEmail())
            .subject(l.getSubject())
            .messagePreview(l.getMessagePreview())
            .status(l.getStatus() != null ? l.getStatus().name() : null)
            .failureReason(l.getFailureReason())
            .retryCount(l.getRetryCount())
            .sentAt(l.getSentAt())
            .relatedType(l.getRelatedType())
            .relatedId(l.getRelatedId())
            .createdAt(l.getCreatedAt())
            .build();
    }
}
