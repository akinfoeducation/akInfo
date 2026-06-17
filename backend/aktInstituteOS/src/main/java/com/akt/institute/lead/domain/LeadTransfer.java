package com.akt.institute.lead.domain;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeadTransfer {
    private Long    id;
    private Long    leadId;
    private Long    instituteId;
    private String  transferType;   // BRANCH_TRANSFER | POOL_CLAIM | REASSIGN
    private Long    fromCallerId;
    private Long    toCallerId;
    private Long    toBranchId;
    private String  notes;
    private Instant transferredAt;
    private Long    transferredBy;
}
