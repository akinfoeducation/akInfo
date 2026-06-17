package com.akt.institute.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * One row in the admin Caller Performance table.
 * All counts are scoped to the requested date range.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CallerPerformanceRow {

    private Long    callerId;
    private String  callerName;
    private String  callerPhone;

    // ── Volume ────────────────────────────────────────────────────────────────
    private long leadsAssigned;     // leads whose assigned_to_id = this caller in range
    private long callsAttempted;    // leads that moved past ASSIGNED (any non-ASSIGNED status)
    private long connected;         // CONTACTED | INTERESTED | FOLLOW_UP | CALLBACK | VISIT_PLANNED | ADMISSION_INTERESTED | PAYMENT_PENDING | PAYMENT_VERIFIED | BOOKING_CONFIRMED
    private long notConnected;      // NOT_CONNECTED
    private long interested;        // INTERESTED
    private long followUps;         // leads with status = FOLLOW_UP or CALLBACK
    private long visitPlanned;      // VISIT_PLANNED
    private long admissionsConverted; // BOOKING_CONFIRMED
    private long branchTransfers;   // lead_transfers.transfer_type = 'BRANCH_TRANSFER' by this caller

    // ── Rates (0–100 rounded to 1 dp) ────────────────────────────────────────
    private double connectionRate;         // connected / callsAttempted * 100
    private double interestedRate;         // interested / connected * 100
    private double admissionConversionRate;// admissionsConverted / leadsAssigned * 100

    // ── Activity ──────────────────────────────────────────────────────────────
    private Instant lastActivityAt;   // latest lead_activities.created_at for this caller
}
