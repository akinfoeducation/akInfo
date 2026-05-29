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
public class AdmissionResponse {

    private Long id;
    private String uuid;
    private String admissionNumber;
    private Long leadId;
    private Long studentId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phone;
    private String email;
    private String courseName;
    private String batchName;
    private Long   batchId;
    private BigDecimal feesAgreed;
    private BigDecimal feesPaid;
    private BigDecimal feesDue;
    private LocalDate enrollmentDate;
    private String status;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
}
