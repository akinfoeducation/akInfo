package com.akt.institute.lead.domain;

/**
 * Named actions a user can perform on a lead.
 *
 * Each action maps to one or more (stage, status) transitions inside
 * LeadWorkflowService. The frontend calls POST /leads/{id}/actions with
 * one of these values — it never sets a raw status directly.
 *
 * Grouped by who performs them:
 *
 * ── CALLER ACTIONS ─────────────────────────────────────────────────────────
 *   MARK_CONTACTED          — call was made and lead picked up
 *   MARK_INTERESTED         — lead expressed interest during call
 *   REQUEST_CALLBACK        — lead asked to be called back at a specific time
 *   SCHEDULE_FOLLOW_UP      — caller scheduling a follow-up call
 *   PLAN_VISIT              — visit date agreed; lead will come to institute
 *   RESCHEDULE_VISIT        — previous visit date missed; new date agreed
 *   CONFIRM_REMOTE_ADMISSION— lead confirmed interest in online/remote joining
 *   CALL_NOT_CONNECTED      — call made, lead did not answer (→ retry pool)
 *   MARK_NOT_INTERESTED     — lead said no
 *   MARK_NOT_REACHABLE      — multiple attempts, completely unreachable
 *   TRANSFER_BRANCH         — lead wants a different branch
 *
 * ── COUNSELLOR ACTIONS ──────────────────────────────────────────────────────
 *   CONFIRM_VISIT           — student physically arrived at institute
 *   SCHEDULE_POST_VISIT_FOLLOWUP — student visited, needs follow-up before deciding
 *   START_NEGOTIATION       — fee/batch/scholarship discussion started
 *   REQUEST_DOCUMENTS       — counsellor requested required documents
 *   MARK_DOCUMENTS_RECEIVED — all required documents received
 *   START_ADMISSION         — counsellor actively filling admission form
 *   COMPLETE_ADMISSION      — student fully enrolled; student record + batch assigned
 *
 * ── SHARED (Caller or Counsellor) ───────────────────────────────────────────
 *   MARK_NOT_INTERESTED     — lead/student said no at any stage
 *
 * ── ADMIN ONLY ──────────────────────────────────────────────────────────────
 *   ADMIN_STATUS_OVERRIDE   — bypass workflow; set any status directly (requires reason)
 *   REASSIGN_COUNSELLOR     — move post-handoff lead to a different counsellor
 */
public enum LeadAction {

    // ── Caller ────────────────────────────────────────────────────────────────
    MARK_CONTACTED,
    MARK_INTERESTED,
    REQUEST_CALLBACK,
    SCHEDULE_FOLLOW_UP,
    PLAN_VISIT,
    RESCHEDULE_VISIT,
    CONFIRM_REMOTE_ADMISSION,
    CALL_NOT_CONNECTED,
    MARK_NOT_INTERESTED,
    MARK_INVALID,             // wrong number / fake / unusable contact
    MARK_NOT_REACHABLE,
    TRANSFER_BRANCH,

    /**
     * Student physically arrived at the institute.
     * Caller marks the visit done and simultaneously hands off to a counsellor.
     * Required field: counsellorId
     * Optional field: notes
     */
    STUDENT_VISITED,

    // ── Counsellor ────────────────────────────────────────────────────────────
    CONFIRM_VISIT,
    SCHEDULE_POST_VISIT_FOLLOWUP,
    START_NEGOTIATION,
    REQUEST_DOCUMENTS,
    MARK_DOCUMENTS_RECEIVED,
    START_ADMISSION,
    COMPLETE_ADMISSION,

    // ── Admin only ────────────────────────────────────────────────────────────
    ADMIN_STATUS_OVERRIDE,
    REASSIGN_COUNSELLOR
}
