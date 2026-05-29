package com.akt.institute.notification.domain;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationLog {

    private Long id;
    private Long instituteId;
    private NotificationChannel channel;
    private String templateType;
    private String recipientName;
    private String recipientPhone;
    private String recipientEmail;
    private String subject;
    private String messagePreview;
    @Builder.Default
    private NotificationStatus status = NotificationStatus.PENDING;
    private String failureReason;
    @Builder.Default
    private int retryCount = 0;
    private Instant sentAt;
    private String relatedType;   // ADMISSION, FEE_PAYMENT, BROADCAST
    private Long relatedId;
    private Instant createdAt;
}
