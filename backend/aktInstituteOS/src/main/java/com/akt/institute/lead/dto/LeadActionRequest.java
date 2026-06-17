package com.akt.institute.lead.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for POST /leads/{id}/actions
 *
 * The caller specifies WHAT happened (action), not what status to set.
 * The workflow engine resolves the resulting status/stage transition.
 */
@Data
public class LeadActionRequest {

    /** Required — the named action being performed. Maps to LeadAction enum. */
    @NotBlank(message = "action is required")
    private String action;

    // ── Optional context fields ───────────────────────────────────────────────

    /** For PLAN_VISIT / RESCHEDULE_VISIT — the agreed visit date (ISO-8601) */
    private String visitDate;

    /** For SCHEDULE_FOLLOW_UP / REQUEST_CALLBACK — when to follow up (ISO-8601) */
    private String followUpAt;

    /** For MARK_NOT_INTERESTED / MARK_NOT_REACHABLE / ADMIN_STATUS_OVERRIDE — why */
    private String reason;

    /** For HANDOFF / REASSIGN_COUNSELLOR — target counsellor ID */
    private Long counsellorId;

    /** For TRANSFER_BRANCH — target branch ID */
    private Long branchId;

    /** For ADMIN_STATUS_OVERRIDE — the raw status to force-set */
    private String overrideStatus;

    /** General notes / remarks for the activity log */
    private String notes;

    /** Call outcome for MARK_CONTACTED — e.g. INTERESTED, CALLBACK, FOLLOW_UP */
    private String outcome;
}
