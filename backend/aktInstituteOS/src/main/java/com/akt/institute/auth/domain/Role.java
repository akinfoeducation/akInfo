package com.akt.institute.auth.domain;

import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    private Long    id;
    private Long    instituteId;
    private String  name;
    private String  code;
    private String  description;
    @Builder.Default
    private boolean isSystem = false;
    @Builder.Default
    private boolean isActive = true;
    @Builder.Default
    private Set<Permission> permissions = new HashSet<>();

    // Audit fields (not in BaseEntity since Role predates that pattern)
    private Instant createdAt;
    private Instant updatedAt;
    private Long    createdBy;
    private Long    updatedBy;
    private Instant deletedAt;
}
