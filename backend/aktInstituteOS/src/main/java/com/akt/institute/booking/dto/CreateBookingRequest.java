package com.akt.institute.booking.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateBookingRequest {

    @NotNull(message = "batchId is required")
    private Long batchId;

    private BigDecimal paymentAmount;

    private String notes;

    /**
     * REMOTE_TOKEN      — caller closes a remote/token booking without institute visit.
     * ADMISSION_CLOSING — counsellor closes in-person admission after visit.
     * Defaults to ADMISSION_CLOSING when omitted.
     */
    private String bookingType;
}
