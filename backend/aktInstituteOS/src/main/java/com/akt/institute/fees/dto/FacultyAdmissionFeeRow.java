package com.akt.institute.fees.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Read-only fee summary per admission, returned to faculty users.
 * Scoped to batches the faculty member is assigned to via batch_faculty.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FacultyAdmissionFeeRow {

    private Long   admissionId;
    private String admissionNumber;

    // Student
    private Long   studentId;
    private String studentName;
    private String phone;

    // Academic context
    private Long   batchId;
    private String batchName;
    private String courseName;

    // Fee figures
    private BigDecimal feesAgreed;
    private BigDecimal feesPaid;
    private BigDecimal feesDue;

    // Derived status: PAID | PARTIAL | PENDING
    private String feeStatus;

    private String lastPaymentDate;  // ISO date string, nullable
    private String enrollmentDate;
    private String admissionStatus;
}
