package com.akt.institute.report.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PendingFeeReportRow {
    private Long   id;
    private String admissionNumber;
    private String studentName;
    private String phone;
    private String courseName;
    private String batchName;
    private BigDecimal feesAgreed;
    private BigDecimal feesPaid;
    private BigDecimal feesDue;
    private String status;
    private String enrollmentDate;
    private int    daysSinceEnrollment;
}
