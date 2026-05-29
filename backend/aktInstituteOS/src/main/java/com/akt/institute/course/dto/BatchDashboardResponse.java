package com.akt.institute.course.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BatchDashboardResponse {
    private int totalBatches;
    private int activeBatches;
    private int plannedBatches;
    private int completedBatches;
    private int cancelledBatches;
    private int totalEnrolled;
    private List<BatchResponse> active;
    private List<BatchResponse> upcoming;
}
