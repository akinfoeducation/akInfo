package com.akt.institute.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SaveTemplateRequest {

    @NotBlank
    private String name;

    @NotNull
    private String type;     // TemplateType enum name

    @NotNull
    private String channel;  // EMAIL, WHATSAPP, BOTH

    private String subject;

    @NotBlank
    private String body;

    private String variables;

    private boolean isDefault;
}
