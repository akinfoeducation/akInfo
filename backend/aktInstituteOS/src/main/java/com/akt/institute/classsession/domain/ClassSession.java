package com.akt.institute.classsession.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassSession extends BaseEntity {

    private String    uuid;
    private Long      instituteId;
    private Long      batchId;
    private String    batchName;
    private Long      timetableId;
    private Long      facultyUserId;
    private String    facultyName;
    private LocalDate sessionDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String    subject;
    private String    topicCovered;
    private String    sessionNotes;
    private String    homeworkNotes;
    private String    status;           // SCHEDULED | COMPLETED | CANCELLED | HOLIDAY
    private boolean   attendanceMarked;
    private int       presentCount;
    private int       totalStudents;
}
