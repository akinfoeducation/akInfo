package com.akt.institute.booking.domain;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdmissionBooking {
    private Long id;
    private String uuid;
    private Long instituteId;
    private Long leadId;
    private Long batchId;
    private BigDecimal paymentAmount;
    private String paymentProofUrl;
    private Instant paymentProofUploadedAt;
    private BookingStatus bookingStatus;
    private Long paymentVerifiedBy;
    private Instant paymentVerifiedAt;
    private String notes;
    private Long createdBy;
    private Long updatedBy;
    private Instant createdAt;
    private Instant updatedAt;
    // Fix 3: booking type + active flag + cancellation
    @Builder.Default
    private String  bookingType = "ADMISSION_CLOSING"; // REMOTE_TOKEN | ADMISSION_CLOSING
    @Builder.Default
    private boolean active      = true;                // false when cancelled
    private Instant cancelledAt;
    private Long    cancelledBy;
    private String  cancelReason;
    // Joined from leads for list/detail display — not persisted on this table
    private String  leadName;
    private String  leadPhone;
}
