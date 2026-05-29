package com.akt.institute.report.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class FeeCollectionReportRow {
    private Long   id;
    private String receiptNumber;
    private String admissionNumber;
    private String studentName;
    private String phone;
    private String courseName;
    private BigDecimal amount;
    private String paymentDate;
    private String paymentMode;
    private String referenceNumber;
    private String collectedBy;
}
