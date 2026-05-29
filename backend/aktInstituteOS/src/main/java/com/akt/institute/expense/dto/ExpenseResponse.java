package com.akt.institute.expense.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ExpenseResponse {
    private Long id;
    private String expenseNumber;
    private String category;
    private String description;
    private BigDecimal amount;
    private String expenseDate;
    private String paidTo;
    private String paymentMode;
    private String referenceNumber;
    private String notes;
    private String createdByName;
    private String createdAt;
}
