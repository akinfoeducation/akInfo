package com.akt.institute.lead.activity.domain;

import lombok.*;

import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeadActivity {
    private Long id;
    private Long instituteId;
    private Long leadId;
    private String actionType;       // legacy type / high-level category key
    private String leadAction;       // LeadAction enum value (new action-driven field)
    private String actionCategory;   // CALL, STATUS, HANDOFF, TRANSFER, SYSTEM, ADMIN_OVERRIDE
    private String outcome;          // REACHED, NOT_CONNECTED, INTERESTED, etc.
    private String description;
    private Long performedBy;
    private String performedByName;  // transient — populated by JOIN, not persisted
    private Instant createdAt;
}
