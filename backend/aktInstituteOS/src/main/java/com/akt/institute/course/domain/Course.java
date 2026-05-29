package com.akt.institute.course.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course extends BaseEntity {

    private String uuid;
    private Long instituteId;
    private String name;
    private String code;
    private String description;
    private Integer durationWeeks;
    @Builder.Default
    private BigDecimal fees = BigDecimal.ZERO;
    @Builder.Default
    private CourseStatus status = CourseStatus.ACTIVE;
    private List<Batch> batches;
}
