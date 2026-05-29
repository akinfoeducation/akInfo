package com.akt.institute.lead.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateLeadStatusRequest {

    @NotBlank(message = "Status is required")
    private String status;
}
