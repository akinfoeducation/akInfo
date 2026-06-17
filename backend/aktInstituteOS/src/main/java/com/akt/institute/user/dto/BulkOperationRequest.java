package com.akt.institute.user.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class BulkOperationRequest {

    public enum Operation { ACTIVATE, DEACTIVATE, ASSIGN_ROLE, DELETE }

    @NotNull(message = "Operation is required")
    private Operation operation;

    @NotEmpty(message = "At least one user ID is required")
    private Set<Long> userIds;

    /** Required when operation = ASSIGN_ROLE */
    private Long roleId;
}
