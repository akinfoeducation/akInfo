package com.akt.institute.department.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DepartmentRequest {
    @NotBlank(message = "Department name is required")
    @Size(max = 200)
    private String name;

    @NotBlank(message = "Department code is required")
    @Size(max = 50)
    private String code;

    private String description;
    private boolean active = true;
}
