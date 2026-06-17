package com.akt.institute.booking.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingResponse {
    private Long id;
    private String uuid;
    private Long leadId;
    private Long batchId;
    private String batchName;
    private BigDecimal paymentAmount;
    private String paymentProofUrl;
    private Instant paymentProofUploadedAt;
    private String bookingStatus;
    private Long paymentVerifiedBy;
    private Instant paymentVerifiedAt;
    private String notes;
    // Fix 3
    private String  bookingType;    // REMOTE_TOKEN | ADMISSION_CLOSING
    private Boolean active;
    private Instant cancelledAt;
    private Instant createdAt;
    private Instant updatedAt;
    // Joined applicant details for list/queue display
    private String  leadName;
    private String  leadPhone;
}
