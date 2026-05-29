package com.akt.institute.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BroadcastRequest {

    @NotNull
    private String channel;     // EMAIL, WHATSAPP

    @NotBlank
    private String message;

    private String subject;     // required for email

    // ── Filters (all optional; no filter = send to all admissions) ─────────

    private Long   courseId;
    private Long   batchId;
    private String admissionStatus;
    private String leadStatus;
    private Boolean feePendingOnly;
}
