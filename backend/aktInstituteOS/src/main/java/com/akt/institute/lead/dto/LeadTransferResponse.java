package com.akt.institute.lead.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class LeadTransferResponse {
    private Long    id;
    private String  transferType;
    private Long    fromCallerId;
    private Long    toCallerId;
    private Long    toBranchId;
    private String  toBranchName;
    private String  notes;
    private Instant transferredAt;
    private Long    transferredBy;
}
