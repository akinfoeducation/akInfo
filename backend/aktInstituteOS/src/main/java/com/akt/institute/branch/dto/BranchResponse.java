package com.akt.institute.branch.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class BranchResponse {
    private Long    id;
    private String  uuid;
    private Long    instituteId;
    private String  name;
    private String  code;
    private String  address;
    private String  city;
    private String  phone;
    private String  email;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
}
