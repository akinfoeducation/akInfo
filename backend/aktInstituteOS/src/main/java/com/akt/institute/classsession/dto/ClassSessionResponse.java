package com.akt.institute.classsession.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class ClassSessionResponse {
    private Long      id;
    private String    uuid;
    private Long      instituteId;
    private Long      batchId;
    private String    batchName;
    private Long      timetableId;
    private Long      facultyUserId;
    private String    facultyName;
    private LocalDate sessionDate;
    private String    startTime;
    private String    endTime;
    private String    subject;
    private String    topicCovered;
    private String    sessionNotes;
    private String    homeworkNotes;
    private String    status;
    private boolean   attendanceMarked;
    private int       presentCount;
    private int       totalStudents;
    private Instant   createdAt;
    private Instant   updatedAt;
}
