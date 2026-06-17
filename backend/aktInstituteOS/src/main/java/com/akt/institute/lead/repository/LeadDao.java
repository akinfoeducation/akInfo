package com.akt.institute.lead.repository;

import com.akt.institute.lead.domain.Lead;
import com.akt.institute.lead.domain.LeadStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LeadDao {

    Lead save(Lead lead);

    Optional<Lead> findByIdAndInstituteId(Long id, Long instituteId);

    /**
     * True if an <em>active</em> (non-dead) lead with this phone already exists.
     * Leads in {@link com.akt.institute.lead.domain.LeadStatus#ROUTABLE_TERMINAL}
     * do not count — a returning dead number is allowed through so same-number
     * routing (Scenario C9) can re-assign it to the previous caller.
     */
    boolean hasActiveLeadByPhone(String phone, Long instituteId);

    boolean existsByPhoneAndInstituteIdAndIdNot(String phone, Long instituteId, Long excludeId);

    List<Lead> findWithFilters(Long instituteId, String status, String stage, String source, String q,
                               Long assignedToId, LocalDate from, LocalDate to,
                               int page, int size, String sortField, String sortDir);

    long countWithFilters(Long instituteId, String status, String stage, String source, String q,
                          Long assignedToId, LocalDate from, LocalDate to);

    List<Lead> findOverdueFollowups(Long instituteId, Instant before);

    long countByInstituteIdAndStatus(Long instituteId, LeadStatus status);

    void assign(Long leadId, Long callerId, Long updatedBy);

    void unassign(Long leadId, Long updatedBy);

    List<Lead> findByIds(List<Long> ids, Long instituteId);

    // ── Retry Pool ──────────────────────────────────────────────────────────

    /** Leads with status=NOT_CONNECTED whose not_connected_at is older than retryAfterMinutes. */
    List<Lead> findRetryPool(Long instituteId, int retryAfterMinutes, int page, int size);

    long countRetryPool(Long instituteId, int retryAfterMinutes);

    /**
     * Atomically claims a lead from the retry pool.
     * Only succeeds if the lead is still NOT_CONNECTED and not owned by another caller.
     * Returns the number of rows updated (1 = success, 0 = already claimed).
     */
    int claimFromPool(Long leadId, Long callerId, Long updatedBy);

    // ── Counsellor handoff (Fix 1 / Fix 4) ─────────────────────────────────

    /**
     * Transfers lead ownership to a counsellor — sets counsellor_id, assigned_to_id,
     * visit_done_at, handed_off_at, status=VISIT_DONE in one atomic UPDATE.
     * Returns 1 on success, 0 if lead not found or already deleted.
     */
    int handoffToCounsellor(Long leadId, Long counsellorId, Long actorId);

    /**
     * Counsellor self-claim for walk-in leads — same as handoff but guarded by
     * counsellor_id IS NULL to prevent double-claim.
     * Returns 1 on success, 0 if already claimed or deleted.
     */
    int claimAsWalkIn(Long leadId, Long counsellorId, Long updatedBy);

    /**
     * ONLINE lead handoff — transfers ownership to counsellor after BOOKING_CONFIRMED.
     * Does NOT stamp visit_done_at (no physical visit for online leads).
     * Returns 1 on success, 0 if not found or already handed off.
     */
    int handoffOnlineLead(Long leadId, Long counsellorId, Long actorId);

    // ── Same-number routing ─────────────────────────────────────────────────

    /**
     * Returns the most recent caller who was assigned to a lead with this phone
     * within the last withinDays days, across any status.
     */
    Optional<Long> findLastCallerByPhone(String phone, Long instituteId, int withinDays);
}
