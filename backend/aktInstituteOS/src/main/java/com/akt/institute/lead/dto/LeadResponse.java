package com.akt.institute.lead.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LeadResponse {

    private Long id;
    private String uuid;
    private Long admissionId;
    private Long bookingId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phone;
    private String whatsappNumber;
    private String email;
    private String courseInterested;
    private String source;
    private String status;
    private String stage;          // LeadStage: CALLER_PIPELINE / COUNSELLOR_PIPELINE / ADMITTED / DEAD
    private Long assignedToId;
    private Instant assignedAt;
    private String address;
    private String currentWork;
    private String interestedFor;
    private String notes;
    private String deliveryMode;
    private String preferredBatch;
    private String preferredBranch;
    private String parentName;
    private String parentPhone;
    private String parentEmail;
    private Instant nextFollowUpAt;
    private Instant lastContactedAt;
    private Instant convertedAt;
    private Instant notConnectedAt;
    private Long    previousCallerId;
    private Long    branchId;
    // dual ownership (Fix 1)
    private Long    callerId;
    private String  callerName;       // resolved on detail fetch (getById)
    private Long    counsellorId;
    private String  counsellorName;   // resolved on detail fetch (getById)
    private Instant handedOffAt;
    private Instant visitPlannedAt;
    private Instant visitDoneAt;
    private Instant bookingConfirmedAt;
    private Instant admissionDoneAt;
    private Instant createdAt;
    private Instant updatedAt;

    // Populated only on an update where a primary/alternate number was rejected
    // because it already belongs to another active lead (Requirement 6). Null otherwise.
    private java.util.List<LeadDuplicateConflict> duplicateConflicts;
}
