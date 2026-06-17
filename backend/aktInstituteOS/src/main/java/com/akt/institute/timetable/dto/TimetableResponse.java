package com.akt.institute.timetable.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class TimetableResponse {
    private Long      id;
    private String    uuid;
    private Long      instituteId;
    private Long      batchId;
    private String    batchName;
    private Long      facultyUserId;
    private String    facultyName;
    private String    subject;
    private Integer   dayOfWeek;
    private String    dayName;     // Monday, Tuesday…
    private LocalDate specificDate;
    private String    startTime;
    private String    endTime;
    private String    classroom;
    private String    mode;
    private String    onlineLink;
    private LocalDate effectiveFrom;
    private LocalDate effectiveUntil;
    private boolean   active;
    private Instant   createdAt;
}
