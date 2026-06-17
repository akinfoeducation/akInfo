package com.akt.institute.role.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class AssignPermissionsRequest {
    @NotNull(message = "permissionIds is required (can be empty set to clear all)")
    private Set<Long> permissionIds;
}
