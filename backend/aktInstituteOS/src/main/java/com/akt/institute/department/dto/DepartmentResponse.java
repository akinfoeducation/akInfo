package com.akt.institute.department.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class DepartmentResponse {
    private Long    id;
    private String  uuid;
    private Long    instituteId;
    private String  name;
    private String  code;
    private String  description;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
}
