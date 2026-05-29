package com.akt.institute.expense.domain;

import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
public class Expense {
    private Long id;
    private String uuid;
    private Long instituteId;
    private String expenseNumber;
    private String category;
    private String description;
    private BigDecimal amount;
    private LocalDate expenseDate;
    private String paidTo;
    private String paymentMode;
    private String referenceNumber;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;
    private Long createdBy;
    private Long updatedBy;
    // audit display
    private String createdByName;
}
