package com.akt.institute.dashboard.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class CounsellorDashboardResponse {

    // ── Lead pipeline (all statuses scoped to this counsellor) ───────────────
    private long myActiveLeads;
    private long newlyAssigned;          // VISIT_DONE + BOOKING_CONFIRMED just handed off
    private long followUpAfterVisit;
    private long negotiation;
    private long paymentPending;
    private long bookingConfirmed;
    private long documentPending;
    private long admissionInProgress;
    private long notInterested;          // counsellor-closed leads

    // ── Follow-ups ────────────────────────────────────────────────────────────
    private long todayFollowUps;
    private long overdueFollowUps;

    // ── Admission funnel ──────────────────────────────────────────────────────
    private long admissionsDoneThisMonth;
    private long admissionsDoneAllTime;
    private long pendingAdmissions;      // leads in ADMISSION_IN_PROGRESS

    // ── Revenue (from admissions whose lead has counsellor_id = me) ──────────
    private BigDecimal revenueThisMonth;
    private BigDecimal revenueAllTime;
    private BigDecimal feesOutstanding;

    // ── Delivery mode split (leads) ───────────────────────────────────────────
    private long onlineLeadsActive;
    private long offlineLeadsActive;

    // ── Delivery mode split (admissions this month) ───────────────────────────
    private long onlineAdmissionsThisMonth;
    private long offlineAdmissionsThisMonth;
    private long onlineAdmissionsPending;    // ONLINE leads in counsellor phase, not yet done
    private long offlineAdmissionsPending;   // OFFLINE leads in counsellor phase, not yet done
}
