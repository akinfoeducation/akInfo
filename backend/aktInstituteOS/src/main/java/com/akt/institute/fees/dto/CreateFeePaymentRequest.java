package com.akt.institute.fees.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateFeePaymentRequest {

    @NotNull(message = "Admission ID is required")
    private Long admissionId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.0", message = "Amount must be at least ₹1")
    private BigDecimal amount;

    private LocalDate paymentDate;

    private String paymentMode;  // CASH, UPI, CHEQUE, BANK_TRANSFER, OTHER

    @Size(max = 100)
    private String referenceNumber;

    @Size(max = 1000)
    private String notes;
}
