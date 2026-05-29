package com.akt.institute.report.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ExpenseReportRow {
    private Long   id;
    private String expenseNumber;
    private String category;
    private String description;
    private BigDecimal amount;
    private String expenseDate;
    private String paidTo;
    private String paymentMode;
    private String referenceNumber;
    private String createdByName;
}
