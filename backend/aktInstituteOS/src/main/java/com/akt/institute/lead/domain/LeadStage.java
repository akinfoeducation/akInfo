package com.akt.institute.lead.domain;

/**
 * Coarse pipeline stage for a lead.
 *
 * Stage is ALWAYS derived from — and consistent with — the fine-grained
 * LeadStatus, but stored separately so dashboards and list queries can
 * filter by stage without decoding individual status values.
 *
 * Transitions:
 *   CALLER_PIPELINE  → COUNSELLOR_PIPELINE  on HANDOFF / WALK_IN_CLAIM
 *   COUNSELLOR_PIPELINE → ADMITTED          on COMPLETE_ADMISSION
 *   any              → DEAD                 on NOT_INTERESTED / NOT_REACHABLE / BRANCH_TRANSFER
 */
public enum LeadStage {

    /** Lead is being worked by a Caller. Default stage for all new leads. */
    CALLER_PIPELINE,

    /** Lead has visited or been handed off. Counsellor is the active owner. */
    COUNSELLOR_PIPELINE,

    /** Admission complete. Lead is archived; student record exists. */
    ADMITTED,

    /** Lead dropped out at any stage. No further action expected. */
    DEAD;

    /**
     * Derive the correct LeadStage from a LeadStatus.
     * Used during DB reads and admin overrides.
     */
    public static LeadStage fromStatus(LeadStatus status) {
        if (status == null) return CALLER_PIPELINE;
        return switch (status) {
            case ADMISSION_DONE                                      -> ADMITTED;
            case NOT_INTERESTED, NOT_REACHABLE, CLOSED              -> DEAD;
            case VISIT_DONE, FOLLOW_UP_AFTER_VISIT, NEGOTIATION,
                 DOCUMENT_PENDING, ADMISSION_IN_PROGRESS             -> COUNSELLOR_PIPELINE;
            default                                                  -> CALLER_PIPELINE;
        };
    }
}
