package com.akt.institute.course.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateBatchRequest {

    @Size(max = 200)
    private String name;

    @Size(max = 30)
    private String batchCode;

    @Size(max = 20)
    private String mode;

    @Size(max = 200)
    private String facultyName;

    @Size(max = 100)
    private String timing;

    private LocalDate startDate;

    private LocalDate endDate;

    @Min(value = 1)
    private Integer maxCapacity;

    private String status;
}
