package com.akt.institute.report.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

/** Top-level summary bar shown at the top of any report page. */
@Data
@Builder
public class ReportSummary {
    private long   totalAdmissions;
    private BigDecimal totalFeeCollected;
    private BigDecimal pendingFees;
    private long   partialPayments;     // admissions with 0 < feesPaid < feesAgreed
    private BigDecimal totalExpenses;
    private BigDecimal netRevenue;      // collected - expenses
}
