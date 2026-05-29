package com.akt.institute.notification.service;

import com.akt.institute.notification.channel.NotificationSender;
import com.akt.institute.notification.domain.*;
import com.akt.institute.notification.dto.SendMessageRequest;
import com.akt.institute.notification.repository.NotificationDao;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Core notification dispatcher.
 * Resolves templates, renders content, dispatches through channels, and logs results.
 * All dispatch is asynchronous — never blocks the calling thread.
 */
@Service
@Slf4j
public class NotificationDispatcher {

    private final NotificationDao notificationDao;
    private final TemplateRenderer renderer;
    private final Map<NotificationChannel, NotificationSender> senders;

    public NotificationDispatcher(
        NotificationDao notificationDao,
        TemplateRenderer renderer,
        List<NotificationSender> senderList
    ) {
        this.notificationDao = notificationDao;
        this.renderer        = renderer;
        this.senders         = senderList.stream()
            .collect(Collectors.toMap(NotificationSender::channel, Function.identity()));
    }

    /**
     * Dispatch a notification on a specific channel using a pre-resolved template.
     * Called from event listeners and manual send endpoints.
     */
    @Async("notificationExecutor")
    public void dispatch(
        Long             instituteId,
        NotificationChannel channel,
        TemplateType     templateType,
        Map<String, String> variables,
        String           recipientName,
        String           recipientPhone,
        String           recipientEmail,
        String           relatedType,
        Long             relatedId
    ) {
        NotificationSender sender = senders.get(channel);
        if (sender == null || !sender.isEnabled()) {
            log.debug("Channel {} disabled/unavailable — skipping notification", channel);
            return;
        }

        // Resolve template
        var templateOpt = notificationDao.findDefaultTemplate(instituteId, templateType, channel.name());
        if (templateOpt.isEmpty()) {
            log.warn("No default template found for type={}, channel={}", templateType, channel);
            return;
        }
        var template = templateOpt.get();

        String renderedBody    = renderer.render(template.getBody(), variables);
        String renderedSubject = renderer.render(template.getSubject(), variables);
        String preview         = renderer.preview(renderedBody, 500);

        var request = SendMessageRequest.builder()
            .recipientName(recipientName)
            .recipientPhone(recipientPhone)
            .recipientEmail(recipientEmail)
            .subject(renderedSubject)
            .body(renderedBody)
            .htmlBody(channel == NotificationChannel.EMAIL)
            .templateType(templateType.name())
            .relatedType(relatedType)
            .relatedId(relatedId)
            .instituteId(instituteId)
            .build();

        // Create log entry
        var logEntry = NotificationLog.builder()
            .instituteId(instituteId)
            .channel(channel)
            .templateType(templateType.name())
            .recipientName(recipientName)
            .recipientPhone(recipientPhone)
            .recipientEmail(recipientEmail)
            .subject(renderedSubject)
            .messagePreview(preview)
            .status(NotificationStatus.PENDING)
            .relatedType(relatedType)
            .relatedId(relatedId)
            .build();
        notificationDao.saveLog(logEntry);

        // Send with retry
        sendWithRetry(sender, request, logEntry, sender.channel() == NotificationChannel.EMAIL
            ? 3 : 3);
    }

    /**
     * Dispatch an ad-hoc message (manual send, broadcast) without a template lookup.
     */
    @Async("notificationExecutor")
    public void dispatchRaw(
        Long                instituteId,
        NotificationChannel channel,
        String              subject,
        String              body,
        boolean             isHtml,
        String              recipientName,
        String              recipientPhone,
        String              recipientEmail,
        String              relatedType,
        Long                relatedId
    ) {
        NotificationSender sender = senders.get(channel);
        if (sender == null || !sender.isEnabled()) {
            log.debug("Channel {} disabled — skipping raw dispatch", channel);
            return;
        }

        String preview = renderer.preview(body, 500);

        var request = SendMessageRequest.builder()
            .recipientName(recipientName)
            .recipientPhone(recipientPhone)
            .recipientEmail(recipientEmail)
            .subject(subject)
            .body(body)
            .htmlBody(isHtml)
            .relatedType(relatedType)
            .relatedId(relatedId)
            .instituteId(instituteId)
            .build();

        var logEntry = NotificationLog.builder()
            .instituteId(instituteId)
            .channel(channel)
            .recipientName(recipientName)
            .recipientPhone(recipientPhone)
            .recipientEmail(recipientEmail)
            .subject(subject)
            .messagePreview(preview)
            .status(NotificationStatus.PENDING)
            .relatedType(relatedType)
            .relatedId(relatedId)
            .build();
        notificationDao.saveLog(logEntry);

        sendWithRetry(sender, request, logEntry, 3);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void sendWithRetry(NotificationSender sender, SendMessageRequest request,
                                NotificationLog logEntry, int maxAttempts) {
        int attempt = 0;
        Exception lastError = null;

        while (attempt < maxAttempts) {
            attempt++;
            try {
                sender.send(request);
                notificationDao.updateLogStatus(logEntry.getId(), NotificationStatus.SENT, null, attempt);
                log.info("Notification sent via {} to {} (attempt {})",
                    sender.channel(), request.getRecipientName(), attempt);
                return;
            } catch (Exception ex) {
                lastError = ex;
                String msg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
                log.warn("Notification attempt {}/{} failed via {}: {}",
                    attempt, maxAttempts, sender.channel(), msg);

                // Authentication failures will never succeed on retry — bail immediately
                if (isAuthError(ex)) {
                    log.error("Auth error for {} — stopping retries. Check credentials in .env.local", sender.channel());
                    break;
                }

                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(1000L * attempt); // backoff: 1s, 2s
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }

        String reason = lastError != null
            ? (lastError.getMessage() != null ? lastError.getMessage() : lastError.getClass().getSimpleName())
            : "Unknown error";
        notificationDao.updateLogStatus(logEntry.getId(), NotificationStatus.FAILED, reason, attempt);
        log.error("Notification FAILED via {} to {} after {} attempt(s): {}",
            sender.channel(), request.getRecipientName(), attempt, reason);
    }

    private static boolean isAuthError(Exception ex) {
        if (ex == null) return false;
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        return msg.contains("authentication") || msg.contains("auth") || msg.contains("535")
            || msg.contains("credentials") || msg.contains("unauthorized") || msg.contains("401")
            || (ex.getCause() != null && isAuthError((Exception) ex.getCause()));
    }
}
