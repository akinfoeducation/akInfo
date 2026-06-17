package com.akt.institute.lead.domain;

import java.util.Set;

public enum LeadStatus {

    // ── Pre-visit (Caller owns) ──────────────────────────────────────────────
    NEW_LEAD,
    ASSIGNED,
    CONTACTED,
    INTERESTED,
    FOLLOW_UP,
    CALLBACK,
    VISIT_PLANNED,
    NOT_CONNECTED,           // single failed-call → retry pool after 30 min
    NOT_INTERESTED,
    NOT_REACHABLE,

    // ── Remote booking path (Caller owns until VISIT_DONE / BOOKING_CONFIRMED) ─
    ADMISSION_INTERESTED,    // caller confirmed interest remotely
    PAYMENT_PENDING,         // booking created, waiting for payment
    PAYMENT_VERIFIED,        // legacy alias — prefer BOOKING_CONFIRMED
    BOOKING_CONFIRMED,       // seat reserved; OFFLINE→ await visit; ONLINE→ counsellor takes over
    VISIT_PENDING,           // Scenario B: booking confirmed remotely, physical visit still pending

    // ── Post-visit / Counsellor phase (Counsellor owns) ─────────────────────
    VISIT_DONE,              // student visited; ownership transfers to Counsellor
    FOLLOW_UP_AFTER_VISIT,   // counsellor following up post-visit
    NEGOTIATION,             // fee/scholarship discussion in progress
    DOCUMENT_PENDING,        // counsellor awaiting required documents (esp. ONLINE flow)
    ADMISSION_IN_PROGRESS,   // admission record being actively created

    // ── Terminal ─────────────────────────────────────────────────────────────
    ADMISSION_DONE,          // fully onboarded: student + admission + batch created
    CLOSED;                  // branch-transferred or otherwise closed

    /**
     * Dead/closed states that should NOT block a returning phone number.
     * When every existing lead for a phone is in one of these states, a
     * re-import (or create) builds a fresh lead and lets same-number routing
     * (Scenario C9) re-assign it to the previous caller. ADMISSION_DONE is
     * deliberately excluded — an already-enrolled student keeps blocking.
     */
    public static final Set<LeadStatus> ROUTABLE_TERMINAL =
        Set.of(NOT_INTERESTED, NOT_REACHABLE, CLOSED);
}
