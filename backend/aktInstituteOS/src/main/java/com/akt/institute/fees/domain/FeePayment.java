package com.akt.institute.fees.domain;

import com.akt.institute.shared.domain.BaseEntity;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeePayment extends BaseEntity {

    private String uuid;
    private String receiptNumber;
    private Long instituteId;
    private Long admissionId;
    private BigDecimal amount;
    private LocalDate paymentDate;
    @Builder.Default
    private PaymentMode paymentMode = PaymentMode.CASH;
    private String referenceNumber;
    private String notes;

    // Denormalized fields joined from admissions (read-only, not persisted here)
    private String admissionNumber;
    private String studentName;
    private String courseName;
}
