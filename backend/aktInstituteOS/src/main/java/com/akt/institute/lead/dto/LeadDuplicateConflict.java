package com.akt.institute.lead.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Describes a number that was rejected during a lead update because it already
 * belongs to another active lead. Returned on {@link LeadResponse} so the UI can
 * show the duplicate popup (existing lead's status + owner) without interrupting
 * the rest of the save (Requirement 6 — caller-update path).
 */
@Data
@Builder
public class LeadDuplicateConflict {
    private String number;                  // the number that was NOT saved
    private String field;                   // "phone" or "whatsappNumber"
    private Long   conflictingLeadId;       // the active lead that already holds this number
    private String conflictingLeadName;
    private String conflictingLeadStatus;
    private Long   assignedToId;            // current owner of the conflicting lead
    private String assignedToName;         // owner's display name (caller/counsellor)
}
