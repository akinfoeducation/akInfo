package com.akt.institute.course.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateBatchStatusRequest {
    @NotBlank
    private String status;
}
