package com.akt.institute.lead.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignLeadRequest {

    @NotNull(message = "callerId is required")
    private Long callerId;
}
