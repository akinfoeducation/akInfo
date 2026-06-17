package com.akt.institute.role.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class RoleRequest {

    @NotBlank(message = "Role name is required")
    @Size(max = 100)
    private String name;

    @NotBlank(message = "Role code is required")
    @Size(max = 50)
    @Pattern(regexp = "^[A-Z0-9_]+$", message = "Role code must be uppercase letters, digits and underscores only")
    private String code;

    @Size(max = 500)
    private String description;

    private boolean active = true;

    /** Permission IDs to assign to this role. */
    private Set<Long> permissionIds;
}
