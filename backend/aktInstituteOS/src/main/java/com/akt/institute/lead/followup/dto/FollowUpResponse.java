package com.akt.institute.lead.followup.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FollowUpResponse {
    private Long id;
    private Long leadId;
    private Instant scheduledAt;
    private String remarks;
    private boolean done;
    private Instant completedAt;
    private Long createdBy;
    private Instant createdAt;
}
