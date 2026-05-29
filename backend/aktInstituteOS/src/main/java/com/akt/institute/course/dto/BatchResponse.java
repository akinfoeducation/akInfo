package com.akt.institute.course.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BatchResponse {

    private Long   id;
    private String uuid;
    private Long   courseId;
    private String courseName;
    private String courseCode;
    private String name;
    private String batchCode;
    private String mode;           // ONLINE / OFFLINE / HYBRID
    private String facultyName;
    private String timing;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer maxCapacity;
    private int    enrolledCount;
    private int    availableSeats;
    private String status;
    private Instant createdAt;
}
