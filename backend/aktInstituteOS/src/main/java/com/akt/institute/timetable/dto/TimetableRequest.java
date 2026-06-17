package com.akt.institute.timetable.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TimetableRequest {
    @NotNull private Long   batchId;
    private Long   facultyUserId;
    private String subject;
    private Integer dayOfWeek;     // 1-7; provide this OR specificDate
    private LocalDate specificDate;
    @NotNull private String startTime;  // HH:mm
    @NotNull private String endTime;
    private String classroom;
    private String mode;
    private String onlineLink;
    private LocalDate effectiveFrom;
    private LocalDate effectiveUntil;
}
