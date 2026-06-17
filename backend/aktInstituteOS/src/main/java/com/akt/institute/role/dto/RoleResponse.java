package com.akt.institute.role.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Set;

@Data @Builder
public class RoleResponse {
    private Long   id;
    private Long   instituteId;
    private String name;
    private String code;
    private String description;
    private boolean system;
    private boolean active;
    private Set<PermissionResponse> permissions;
    private int  userCount;
    private Instant createdAt;
    private Instant updatedAt;
}
