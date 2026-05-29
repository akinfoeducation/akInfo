package com.akt.institute.report.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class AdmissionReportRow {
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
    private String counsellorName;
    private String enrollmentDate;
    private String createdAt;
}
