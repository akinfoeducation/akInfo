package com.akt.institute.admission.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateAdmissionStatusRequest {

    @NotBlank(message = "Status is required")
    private String status;
}
