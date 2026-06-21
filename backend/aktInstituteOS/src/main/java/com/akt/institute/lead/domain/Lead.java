package com.akt.institute.lead.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lead extends BaseEntity {

    private String uuid;
    private Long instituteId;
    private String firstName;
    private String lastName;
    private String phone;
    private String whatsappNumber;
    private String email;
    private String courseInterested;
    @Builder.Default
    private LeadSource source = LeadSource.UNKNOWN;
    @Builder.Default
    private LeadStatus status = LeadStatus.NEW_LEAD;
    @Builder.Default
    private LeadStage  stage  = LeadStage.CALLER_PIPELINE;
    @Builder.Default
    private Long version = 0L;
    private Long assignedToId;
    private Instant assignedAt;
    private String address;
    private CurrentWork currentWork;
    private InterestedFor interestedFor;
    private String notes;
    private DeliveryMode deliveryMode;
    private String preferredBatch;
    private String preferredBranch;
    private String parentName;
    private String parentPhone;
    private String parentEmail;
    private Instant nextFollowUpAt;
    private Instant lastContactedAt;
    private Instant convertedAt;
    private Instant notConnectedAt;   // set when status = NOT_CONNECTED; retry pool eligible after 30 min
    private Long    previousCallerId; // last non-null caller, used for same-number routing
    private Long    branchId;         // set when lead is transferred to a branch

    // ── Dual ownership (Fix 1) ────────────────────────────────────────────────
    private Long    callerId;          // permanent — set on first assign, never cleared; used for KPI attribution
    private Long    counsellorId;      // set on VISIT_DONE handoff; owns the lead through admission
    private Instant handedOffAt;       // timestamp of caller→counsellor handoff
    private Instant visitPlannedAt;    // when VISIT_PLANNED status was set
    private Instant visitDoneAt;       // when VISIT_DONE / student arrived at institute
    private Instant bookingConfirmedAt; // when seat was reserved (BOOKING_CONFIRMED)
    private Instant admissionDoneAt;   // when full onboarding completed (ADMISSION_DONE)

    public String getFullName() {
        return (lastName != null && !lastName.isBlank())
            ? firstName + " " + lastName
            : firstName;
    }
}
