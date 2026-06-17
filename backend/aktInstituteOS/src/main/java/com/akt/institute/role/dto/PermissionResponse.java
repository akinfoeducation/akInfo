package com.akt.institute.role.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class PermissionResponse {
    private Long   id;
    private String name;
    private String code;
    private String resource;
    private String action;
    private String description;
}
