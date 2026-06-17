package com.akt.institute.lead.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * A single action available for a lead, returned by
 * GET /leads/{id}/available-actions
 *
 * The frontend uses this to render the action button panel without
 * hardcoding role/status logic in React.
 */
@Getter
@Builder
public class AvailableActionResponse {

    /** LeadAction enum value — sent back to POST /actions */
    private String action;

    /** Human-readable label for the button */
    private String label;

    /** True = render as the large primary button; false = secondary */
    private boolean primary;

    /** Optional grouping label (e.g. "Call", "Visit", "Admission") */
    private String group;

    /** If true, action opens an expanded panel (e.g. visit date picker) */
    private boolean requiresInput;
}
