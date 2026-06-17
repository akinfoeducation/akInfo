package com.akt.institute.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CallerDashboardResponse {
    private long assignedLeads;
    private long interestedLeads;
    private long admissionInterested;
    private long pendingCallbacks;
    private long paymentPending;
    private long bookingConfirmed;
    private long todayFollowUps;
    private long overdueFollowUps;
}
