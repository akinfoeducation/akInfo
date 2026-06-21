package com.akt.institute.lead.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Lightweight "does this number already exist?" result for the real-time
 * duplicate check on the lead form (Requirement 6). Exposes only what the popup
 * needs — existence, the existing lead's status, and who currently owns it —
 * not the full lead record.
 */
@Data
@Builder
public class LeadLookupResponse {
    private boolean exists;
    private Long    leadId;
    private String  name;
    private String  phone;
    private String  whatsappNumber;
    private String  status;
    private String  stage;
    private Long    assignedToId;
    private String  assignedToName;   // current owner (caller/counsellor), null if unassigned

    public static LeadLookupResponse notFound() {
        return LeadLookupResponse.builder().exists(false).build();
    }
}
