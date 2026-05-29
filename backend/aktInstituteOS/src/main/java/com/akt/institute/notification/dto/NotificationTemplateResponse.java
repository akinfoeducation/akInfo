package com.akt.institute.notification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationTemplateResponse {

    private Long    id;
    private String  name;
    private String  type;
    private String  channel;
    private String  subject;
    private String  body;
    private String  variables;
    private boolean isActive;
    private boolean isDefault;
    private Instant createdAt;
    private Instant updatedAt;
}
