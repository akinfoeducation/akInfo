package com.akt.institute.department.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Department extends BaseEntity {
    private String  uuid;
    private Long    instituteId;
    private String  name;
    private String  code;
    private String  description;
    @Builder.Default
    private boolean isActive = true;
}
