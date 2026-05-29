package com.akt.institute.course.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CourseSummaryResponse {

    private Long id;
    private String uuid;
    private String name;
    private String code;
    private Integer durationWeeks;
    private BigDecimal fees;
    private String status;
    private int batchCount;
    private Instant createdAt;
}
