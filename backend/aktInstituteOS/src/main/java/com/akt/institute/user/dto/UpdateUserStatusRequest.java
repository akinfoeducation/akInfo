package com.akt.institute.user.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    @NotNull(message = "active field is required")
    private Boolean active;

    private String reason; // optional — stored in audit log
}
