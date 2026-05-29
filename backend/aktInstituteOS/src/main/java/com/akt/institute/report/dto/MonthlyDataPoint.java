package com.akt.institute.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * One data point in a monthly time-series (e.g. revenue trend, admissions trend).
 * {@code month} is formatted as "MMM yyyy" (e.g. "Jan 2026").
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class MonthlyDataPoint {
    private String month;       // "Jan 2026"
    private long count;         // for count-based charts
    private BigDecimal amount;  // for money-based charts (nullable for count charts)
}
