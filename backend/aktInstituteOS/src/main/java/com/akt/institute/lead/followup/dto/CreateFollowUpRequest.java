package com.akt.institute.lead.followup.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateFollowUpRequest {

    @NotBlank(message = "scheduledAt is required")
    private String scheduledAt; // ISO-8601 datetime

    private String remarks;
}
