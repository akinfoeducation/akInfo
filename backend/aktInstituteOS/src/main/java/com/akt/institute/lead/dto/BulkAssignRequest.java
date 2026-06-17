package com.akt.institute.lead.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BulkAssignRequest {

    @NotEmpty(message = "leadIds must not be empty")
    private List<Long> leadIds;

    @NotNull(message = "callerId is required")
    private Long callerId;
}
