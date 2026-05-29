package com.akt.institute.admission.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdmissionSummaryResponse {

    private Long id;
    private String admissionNumber;
    private Long leadId;
    private Long studentId;
    private String fullName;
    private String phone;
    private String courseName;
    private String batchName;
    private BigDecimal feesAgreed;
    private BigDecimal feesPaid;
    private BigDecimal feesDue;
    private LocalDate enrollmentDate;
    private String status;
    private Instant createdAt;
}
