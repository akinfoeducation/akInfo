package com.akt.institute.dashboard.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

/**
 * All data for the dashboard summary cards in a single lightweight response.
 * Every field is a scalar aggregate — no nested objects, no joins beyond simple lookups.
 */
@Data
@Builder
public class DashboardSummaryResponse {

    // Students
    private long totalStudents;

    // Admissions
    private long todayAdmissions;
    private long monthAdmissions;
    private long totalAdmissions;

    // Batches
    private long activeBatches;

    // Fees
    private BigDecimal todayFeeCollection;
    private long todayFeeCount;
    private BigDecimal pendingFees;
    private long overdueCount;

    // Enquiries (leads)
    private long totalEnquiries;
    private long monthEnquiries;
    private long todayFollowUps;   // leads with next_follow_up_at = today
}
