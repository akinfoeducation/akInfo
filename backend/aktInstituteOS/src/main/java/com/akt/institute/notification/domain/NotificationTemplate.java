package com.akt.institute.notification.domain;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationTemplate {

    private Long id;
    private Long instituteId;
    private String name;
    private TemplateType type;
    private String channel;   // EMAIL, WHATSAPP, BOTH
    private String subject;
    private String body;
    private String variables;
    @Builder.Default
    private boolean isActive = true;
    @Builder.Default
    private boolean isDefault = false;
    private Instant createdAt;
    private Instant updatedAt;
}
