package com.akt.institute.fees.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FeesSummaryResponse {

    private BigDecimal collectedToday;
    private BigDecimal collectedThisMonth;
    private BigDecimal collectedThisYear;
    private BigDecimal totalOutstanding;
    private long overdueCount;        // admissions with fees_due > 0
    private long paymentsToday;       // number of receipts today
}
