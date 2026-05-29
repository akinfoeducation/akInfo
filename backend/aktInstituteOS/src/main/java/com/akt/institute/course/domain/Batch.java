package com.akt.institute.course.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Batch extends BaseEntity {

    private String uuid;
    private Long instituteId;
    private Long courseId;
    private String name;
    private String batchCode;
    private String mode;          // ONLINE / OFFLINE / HYBRID
    private String facultyName;
    private String timing;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer maxCapacity;
    @Builder.Default
    private BatchStatus status = BatchStatus.PLANNED;

    // ── Computed / joined ──────────────────────────────────────────────────
    private String courseName;
    private String courseCode;
    private int enrolledCount;    // COUNT(admissions) for this batch
}
