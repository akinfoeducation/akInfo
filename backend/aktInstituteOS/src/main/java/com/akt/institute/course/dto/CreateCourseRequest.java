package com.akt.institute.course.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateCourseRequest {

    @NotBlank(message = "Course name is required")
    @Size(max = 200)
    private String name;

    @NotBlank(message = "Course code is required")
    @Size(max = 20)
    private String code;

    private String description;

    @Min(value = 1, message = "Duration must be at least 1 week")
    private Integer durationWeeks;

    @DecimalMin(value = "0.0", message = "Fees must be non-negative")
    private BigDecimal fees;
}
