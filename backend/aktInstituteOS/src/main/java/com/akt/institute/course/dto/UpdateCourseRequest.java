package com.akt.institute.course.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateCourseRequest {

    @Size(max = 200)
    private String name;

    private String description;

    @Min(value = 1)
    private Integer durationWeeks;

    @DecimalMin(value = "0.0")
    private BigDecimal fees;

    private String status;
}
