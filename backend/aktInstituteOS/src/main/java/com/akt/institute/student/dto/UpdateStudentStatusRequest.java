package com.akt.institute.student.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateStudentStatusRequest {

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "ACTIVE|INACTIVE|GRADUATED|DROPPED", message = "Invalid status value")
    private String status;

    private String reason;
}
