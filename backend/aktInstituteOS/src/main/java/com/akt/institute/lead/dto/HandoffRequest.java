package com.akt.institute.lead.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HandoffRequest {

    @NotNull(message = "counsellorId is required")
    private Long counsellorId;

    private String notes;
}
