package com.akt.institute.fees.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FeePaymentResponse {

    private Long id;
    private String uuid;
    private String receiptNumber;
    private Long admissionId;
    private String admissionNumber;
    private String studentName;
    private String courseName;
    private BigDecimal amount;
    private LocalDate paymentDate;
    private String paymentMode;
    private String referenceNumber;
    private String notes;
    private Instant createdAt;
}
