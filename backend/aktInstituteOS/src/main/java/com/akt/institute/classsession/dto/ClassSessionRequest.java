package com.akt.institute.classsession.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ClassSessionRequest {
    @NotNull private Long      batchId;
    private Long      facultyUserId;
    private Long      timetableId;
    @NotNull private LocalDate sessionDate;
    private String    startTime;    // HH:mm
    private String    endTime;
    private String    subject;
    private String    topicCovered;
    private String    sessionNotes;
    private String    homeworkNotes;
    private String    status;       // defaults to SCHEDULED
}
