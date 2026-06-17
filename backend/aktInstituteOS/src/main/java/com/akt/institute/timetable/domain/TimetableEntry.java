package com.akt.institute.timetable.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableEntry extends BaseEntity {

    private String    uuid;
    private Long      instituteId;
    private Long      batchId;
    private String    batchName;
    private Long      facultyUserId;
    private String    facultyName;
    private String    subject;
    private Integer   dayOfWeek;     // 1=Mon … 7=Sun (ISO); null = specific_date only
    private LocalDate specificDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String    classroom;
    private String    mode;
    private String    onlineLink;
    private LocalDate effectiveFrom;
    private LocalDate effectiveUntil;
    private boolean   active;
}
