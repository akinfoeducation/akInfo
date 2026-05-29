package com.akt.institute.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ManualSendRequest {

    @NotNull
    private String channel;        // EMAIL or WHATSAPP

    @NotBlank
    private String recipientName;

    private String recipientPhone;
    private String recipientEmail;

    private String subject;        // required for email

    @NotBlank
    private String message;
}
