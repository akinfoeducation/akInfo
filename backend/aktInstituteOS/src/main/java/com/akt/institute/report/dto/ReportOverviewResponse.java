package com.akt.institute.report.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ReportOverviewResponse {

    // Leads
    private long totalLeads;
    private long newLeadsThisMonth;
    private long convertedLeadsThisMonth;
    private double conversionRate;          // percent

    // Admissions
    private long totalAdmissions;
    private long admissionsThisMonth;
    private long activeAdmissions;

    // Revenue
    private BigDecimal revenueThisMonth;
    private BigDecimal revenueThisYear;
    private BigDecimal totalOutstanding;
    private long overdueCount;

    // Students
    private long totalStudents;
}
