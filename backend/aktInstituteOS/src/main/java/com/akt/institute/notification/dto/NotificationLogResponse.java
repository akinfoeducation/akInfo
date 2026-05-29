package com.akt.institute.notification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationLogResponse {

    private Long    id;
    private String  channel;
    private String  templateType;
    private String  recipientName;
    private String  recipientPhone;
    private String  recipientEmail;
    private String  subject;
    private String  messagePreview;
    private String  status;
    private String  failureReason;
    private int     retryCount;
    private Instant sentAt;
    private String  relatedType;
    private Long    relatedId;
    private Instant createdAt;
}
