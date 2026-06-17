package com.akt.institute.branch.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Branch extends BaseEntity {
    private String uuid;
    private Long   instituteId;
    private String name;
    private String code;
    private String address;
    private String city;
    private String phone;
    private String email;
    @Builder.Default
    private boolean isActive = true;
}
