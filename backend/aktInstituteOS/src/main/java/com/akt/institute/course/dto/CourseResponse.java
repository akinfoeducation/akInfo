package com.akt.institute.course.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CourseResponse {

    private Long id;
    private String uuid;
    private String name;
    private String code;
    private String description;
    private Integer durationWeeks;
    private BigDecimal fees;
    private String status;
    private List<BatchResponse> batches;
    private Instant createdAt;
    private Instant updatedAt;
}
