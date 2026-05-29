package com.akt.institute.shared.domain;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SequenceCounter {

    private Long id;
    private Long instituteId;
    private String sequenceType;
    private int year;
    private long currentValue;
}
