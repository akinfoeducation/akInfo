package com.akt.institute.expense.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreateExpenseRequest {
    @NotBlank  private String category;
    @NotBlank  private String description;
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    private String expenseDate;    // yyyy-MM-dd, defaults to today
    private String paidTo;
    private String paymentMode;    // defaults to CASH
    private String referenceNumber;
    private String notes;
}
