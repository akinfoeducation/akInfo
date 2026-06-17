package com.akt.institute.lead.followup.domain;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowUp {
    private Long id;
    private Long instituteId;
    private Long leadId;
    private Instant scheduledAt;
    private String remarks;
    private boolean done;
    private Instant completedAt;
    private Long createdBy;
    private Long updatedBy;
    private Instant createdAt;
    private Instant updatedAt;
}
