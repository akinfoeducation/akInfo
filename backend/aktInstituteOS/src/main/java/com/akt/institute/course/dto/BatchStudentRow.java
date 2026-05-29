package com.akt.institute.course.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

/** One student row in a batch's student list. */
@Data @AllArgsConstructor @NoArgsConstructor
public class BatchStudentRow {
    private Long   admissionId;
    private String admissionNumber;
    private String studentName;
    private String phone;
    private String admissionStatus;
    private BigDecimal feesAgreed;
    private BigDecimal feesPaid;
    private BigDecimal feesDue;
    private String enrollmentDate;
}
