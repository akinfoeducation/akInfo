package com.akt.institute.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Revenue + admission count for a single course in the selected period. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CourseBreakdownItem {
    private String courseName;
    private long admissions;
    private BigDecimal revenueCollected;
    private BigDecimal feesAgreed;
    private BigDecimal outstanding;
}
