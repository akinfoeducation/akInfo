package com.akt.institute.notification.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SendMessageRequest {

    private String recipientName;
    private String recipientPhone;   // E.164 format preferred: 919876543210
    private String recipientEmail;

    private String subject;          // for email
    private String body;             // plain or HTML body
    private boolean htmlBody;        // true → send as HTML email

    private String templateType;
    private String relatedType;
    private Long   relatedId;
    private Long   instituteId;
}
