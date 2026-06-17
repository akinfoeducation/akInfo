package com.akt.institute.lead.activity.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LeadActivityResponse {
    private Long id;
    private String actionType;
    private String leadAction;       // LeadAction enum value (null for legacy entries)
    private String actionCategory;   // CALL, STATUS, HANDOFF, etc.
    private String outcome;          // REACHED, NOT_CONNECTED, INTERESTED, etc.
    private String description;
    private Long performedBy;
    private String performedByName;
    private Instant createdAt;
}
