package com.akt.institute.lead.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TransferBranchRequest {
    @NotNull(message = "branchId is required")
    private Long branchId;
    private String notes;
}
